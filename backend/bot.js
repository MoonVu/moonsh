const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// ==================== CẤU HÌNH BOT ====================
// ⚠️ THAY ĐỔI CÁC THÔNG TIN SAU:
const BOT_TOKEN = "7009081424:AAHYPcl1fBSU0SaGcTmJa6BVrFiXsb58yA0";  // Thay bằng token từ BotFather

// URL backend API
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Khởi tạo bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 Telegram Bot đã khởi động...');
console.log('📱 Bot Token:', BOT_TOKEN.substring(0, 10) + '...');
console.log('📊 Groups will be loaded from MongoDB telegram_groups collection');

// ==================== HÀM GỬI BILL VÀO GROUP ====================
/**
 * Gửi bill (ảnh + caption + nút Yes/No) vào các group Telegram theo groupType hoặc selectedGroups
 * @param {string} billId - ID của bill
 * @param {string} imagePath - Path hoặc URL của ảnh bill
 * @param {string} caption - Caption tùy chọn
 * @param {string} groupType - Loại nhóm (SHBET hoặc THIRD_PARTY)
 * @param {Array} selectedGroups - Danh sách nhóm được chọn cụ thể
 */
async function sendBillToGroup(billId, imagePath, caption = '', groupType = 'SHBET', selectedGroups = [], employee = 'N/A') {
  try {
    console.log(`📤 Gửi bill ${billId} vào nhóm ${groupType}...`);
    
    // Lấy danh sách nhóm theo groupType từ MongoDB
    const TelegramGroup = require('./models/TelegramGroup');
    const groupDoc = await TelegramGroup.findOne({ type: groupType });
    
    if (!groupDoc || !groupDoc.subGroups || groupDoc.subGroups.length === 0) {
      throw new Error(`Không tìm thấy nhóm ${groupType}`);
    }
    
    // Nếu có selectedGroups, filter theo danh sách được chọn
    // Nếu không có selectedGroups, gửi cho tất cả subGroups
    let groupsToSend = groupDoc.subGroups;
    if (selectedGroups && selectedGroups.length > 0) {
      groupsToSend = groupDoc.subGroups.filter(subGroup => {
        // selectedGroups có thể là array of IDs (string) hoặc array of objects
        return selectedGroups.some(selected => {
          if (typeof selected === 'string') {
            // Nếu selected là string (ID), so sánh trực tiếp
            return selected === subGroup._id.toString();
          } else if (typeof selected === 'object') {
            // Nếu selected là object, so sánh theo _id hoặc telegramId
            return selected._id === subGroup._id.toString() || 
                   selected.telegramId === subGroup.telegramId;
          }
          return false;
        });
      });
    }
    // Nếu selectedGroups rỗng hoặc không có, groupsToSend = tất cả subGroups
    
    if (groupsToSend.length === 0) {
      throw new Error(`Không có nhóm nào được chọn để gửi`);
    }
    
    // Tạo caption với thông tin bill
    // Parse caption để lấy thông tin từ format: "📋 Hóa đơn {customer}\r\n\r\n{note}"
    const customerMatch = caption.match(/📋 Hóa đơn (.+?)(?:\r?\n|$)/);
    const noteMatch = caption.match(/\r?\n\r?\n(.+)$/);
    
    const customer = customerMatch ? customerMatch[1].trim() : 'N/A';
    const note = noteMatch ? noteMatch[1].trim() : 'Không có ghi chú';
    
    // Lấy thông tin người gửi từ API data thay vì parse caption
    // (sẽ được truyền từ frontend qua API)
    
    // Tạo caption chi tiết
    const billCaption = `*CHECK HÓA ĐƠN MẤY NÍ ƠI*

🆔 *ID khách: ${customer}
📄 *Mã đơn: ${billId}
👤 *Người gửi: ${employee}
📝 **Ghi chú: ${note}

❓ **Vui lòng chọn câu trả lời:**`;
    
    // Tạo inline keyboard với 4 lựa chọn
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '✅已上分/Đã lên điểm',
              callback_data: `bill_response_${billId}_diem`
            },
            {
              text: '💰已收到钱/Nhận đc tiền', 
              callback_data: `bill_response_${billId}_nhan_tien`
            }
          ],
          [
            {
              text: '🚫不是我们的/Không phải bên mình',
              callback_data: `bill_response_${billId}_khong_phai`
            },
            {
              text: '🚫尚未收到钱/Chưa nhận đc tiền',
              callback_data: `bill_response_${billId}_chua_tien`
            }
          ]
        ]
      }
    };

    
    // Gửi đến các subgroups được chọn
    const results = [];
    for (const subGroup of groupsToSend) {
      try {
        const message = await bot.sendPhoto(subGroup.telegramId, imagePath, {
          caption: billCaption,
          ...keyboard
        });

        results.push({
          chatId: subGroup.telegramId,
          groupName: subGroup.name,
          messageId: message.message_id,
          success: true
        });

        console.log(`✅ Đã gửi đến ${subGroup.name}. Message ID: ${message.message_id}`);
      } catch (error) {
        console.error(`❌ Lỗi gửi đến ${subGroup.name} (${subGroup.telegramId}):`, error.message);
        results.push({
          chatId: subGroup.telegramId,
          groupName: subGroup.name,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Đã gửi bill ${billId} đến ${successCount}/${results.length} nhóm`);
    
    return {
      success: successCount > 0,
      results: results,
      billId: billId,
      totalGroups: results.length,
      successCount: successCount
    };

  } catch (error) {
    console.error(`❌ Lỗi gửi bill ${billId}:`, error.message);
    return {
      success: false,
      error: error.message,
      results: []
    };
  }
}

// ==================== XỬ LÝ CALLBACK QUERIES (NÚT YES/NO) ====================
// Store để track callback đã xử lý (tránh duplicate)
const processedCallbacks = new Set();

bot.on('callback_query', async (callbackQuery) => {
  const callbackId = callbackQuery.id;
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const user = callbackQuery.from;

  // Kiểm tra callback đã xử lý chưa (tránh duplicate)
  if (processedCallbacks.has(callbackId)) {
    await bot.answerCallbackQuery(callbackId, {
      text: 'Đã xử lý',
      show_alert: false
    });
    return;
  }
  
  // Đánh dấu callback đã xử lý
  processedCallbacks.add(callbackId);
  
  // Cleanup sau 1 phút để tránh memory leak
  setTimeout(() => {
    processedCallbacks.delete(callbackId);
  }, 60000);

  try {
    // Kiểm tra xem có phải callback của bill không
    if (data.startsWith('bill_response_')) {
      // Parse callback data: bill_response_{billId}_{responseType}
      // Vì billId có thể chứa underscore, cần parse cẩn thận
      const parts = data.split('_');
      if (parts.length >= 4) {
        // Tìm responseType từ cuối (không phải diem, chua_diem, khong_phai, chua_tien)
        const possibleResponseTypes = ['diem', 'nhan_tien', 'khong_phai', 'chua_tien'];
        let responseType = '';
        let billId = '';
        
        // Thử tìm responseType từ cuối
        for (const rType of possibleResponseTypes) {
          if (data.endsWith(`_${rType}`)) {
            responseType = rType;
            billId = data.replace(`bill_response_`, '').replace(`_${rType}`, '');
            break;
          }
        }
        
        // Fallback nếu không tìm thấy
        if (!responseType) {
          billId = parts.slice(2, -1).join('_');
          responseType = parts[parts.length - 1];
        }
        
        console.log(`🔍 Parsing callback data: ${data}`);
        console.log(`🔍 Parts:`, parts);
        console.log(`🔍 BillId: ${billId}, ResponseType: ${responseType}`);
        
        // Map response type to display text and status
        const responseMap = {
          'diem': { text: 'Đã lên điểm', emoji: '✅', status: 'YES' },
          'nhan_tien': { text: 'Nhận đc tiền', emoji: '💰', status: 'NHAN' },
          'khong_phai': { text: 'Không phải bên mình', emoji: '🚫', status: 'KHONG' },
          'chua_tien': { text: 'Chưa nhận đc tiền', emoji: '🚫', status: 'CHUA' }
        };
        
        const responseInfo = responseMap[responseType] || { text: 'Unknown', emoji: '❓', status: 'NO' };
        
        console.log(`🔍 ResponseInfo:`, responseInfo);
        
        // Trả lời trong group
        const userName = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
        const replyText = `${responseInfo.emoji} <b>${userName}</b>: <b>${responseInfo.text}</b> cho bill <b>${billId}</b>`;
        
        await bot.sendMessage(chatId, replyText, { 
          parse_mode: 'HTML',
          reply_to_message_id: messageId 
        });

        // Gửi dữ liệu về API backend
        try {
          const apiData = {
            billId: billId,
            choice: responseInfo.text,
            responseType: responseType,
            status: responseInfo.status, // Gửi status mới: YES, NO, CHUA, KHONG
            isYes: responseInfo.status === 'YES', // Chỉ "Đã lên điểm" là YES
            userId: user.id,
            userName: userName,
            username: user.username,
            userFirstName: user.first_name || null,
            userLastName: user.last_name || null,
            userLanguageCode: user.language_code || null,
            timestamp: new Date().toISOString(),
            chatId: chatId,
            messageId: messageId,
            // Thêm metadata từ Telegram
            telegramData: {
              from: user,
              chat: {
                id: chatId,
                type: callbackQuery.message.chat.type,
                title: callbackQuery.message.chat.title || null,
                username: callbackQuery.message.chat.username || null
              },
              message: {
                message_id: messageId,
                date: callbackQuery.message.date,
                caption: callbackQuery.message.caption
              }
            }
          };
          
          console.log(`🔍 Sending to API:`, apiData);
          const response = await axios.post(`${BACKEND_URL}/api/telegram`, apiData);
        } catch (apiError) {
          console.error(`❌ Lỗi gửi dữ liệu về backend:`, apiError.message);
        }

        // Trả lời callback query để tắt loading
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: `Bạn đã chọn ${responseInfo.text} cho bill ${billId}`,
          show_alert: false
        });

        // Ẩn các nút Yes/No để tránh bấm lại
        try {
          await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
            chat_id: chatId,
            message_id: messageId
          });
        } catch (e) {
          // Nếu là ảnh/caption, editMessageReplyMarkup vẫn áp dụng được; 
          // nhưng nếu có lỗi thì bỏ qua để không chặn luồng chính
        }
      }
    }
  } catch (error) {
    console.error('❌ Lỗi xử lý callback query:', error);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: 'Có lỗi xảy ra, vui lòng thử lại',
      show_alert: true
    });
  }
});

// ==================== XỬ LÝ LỖI BOT ====================
bot.on('error', (error) => {
  console.error('❌ Bot Error:', error);
});

bot.on('polling_error', (error) => {
  console.error('❌ Polling Error:', error);
});

// ==================== XỬ LÝ TIN NHẮN THƯỜNG ====================
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const chatType = msg.chat.type;

  // Chỉ xử lý tin nhắn trong group/supergroup (không xử lý private chat)
  if (chatType === 'group' || chatType === 'supergroup') {
    // Chỉ xử lý lệnh /help, bỏ qua các tin nhắn khác để tránh spam log
    if (text && text.toLowerCase().includes('/help')) {
      console.log(`💬 /help từ ${msg.from.first_name} trong group ${msg.chat.title || chatId}`);
      bot.sendMessage(chatId, 
        `🤖 Bot Bill Confirmation\n\n` +
        `Chức năng:\n` +
        `• Gửi bill với ảnh và 4 nút thao tác\n` +
        `• Theo dõi phản hồi từ thành viên group\n` +
        `• Gửi dữ liệu về hệ thống backend\n\n` +
        `Liên hệ admin để được hỗ trợ.`
      );
    }
  }
});

// ==================== EXPORT HÀM ====================
module.exports = {
  sendBillToGroup,
  bot
};

// ==================== THÔNG BÁO KHỞI ĐỘNG ====================
console.log('🚀 Telegram Bot đã sẵn sàng!');
console.log('📋 Để test bot, gửi lệnh /help trong group');
console.log('⚠️  Nhớ cấu hình BOT_TOKEN và GROUP_CHAT_ID trong file này!');
