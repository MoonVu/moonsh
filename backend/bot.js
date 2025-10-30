const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { default: PQueue } = require('p-queue');
const mongoose = require('mongoose');
const BillConversation = require('./models/BillConversation');

// ==================== CẤU HÌNH BOT ====================
// ⚠️ THAY ĐỔI CÁC THÔNG TIN SAU:
const BOT_TOKEN = "8026142464:AAG5_HhcvRNQ9iodYJn9T-5-0PrJ9cfCcg0";  // Thay bằng token từ BotFather 8026142464:AAG5_HhcvRNQ9iodYJn9T-5-0PrJ9cfCcg0

// URL backend API
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Khởi tạo bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ==================== CẤU HÌNH QUEUE XỬ LÝ CALLBACK ====================
// ⚠️ QUAN TRỌNG: Tách queue để xử lý hiệu quả hơn

// Queue cho inline keyboard callbacks (ưu tiên nhanh)
const inlineQueue = new PQueue({
  concurrency: 3,     // Xử lý inline callbacks nhanh
  timeout: 30000,
  throwOnTimeout: false
});

// Queue cho reply messages (có thể xử lý nhiều hơn)
const replyQueue = new PQueue({
  concurrency: 7,    // Xử lý 10 reply đồng thời (vì chỉ lưu DB)
  timeout: 30000,
  throwOnTimeout: false
});

console.log(`⚙️  Inline Queue: ${inlineQueue.concurrency} tasks đồng thời`);
console.log(`⚙️  Reply Queue: ${replyQueue.concurrency} tasks đồng thời`);

// ==================== MONITORING QUEUE ====================
// Theo dõi queue để đảm bảo không bị stuck
setInterval(() => {
  if (inlineQueue.size > 0 || inlineQueue.pending > 0 || replyQueue.size > 0 || replyQueue.pending > 0) {
    console.log(`📊 Queue Status - Inline: ${inlineQueue.size} chờ, ${inlineQueue.pending} xử lý | Reply: ${replyQueue.size} chờ, ${replyQueue.pending} xử lý`);
  }
}, 10000); // Log mỗi 10 giây

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
    
    // Caption hiện là 1 dòng nội dung đã chuẩn hóa; nếu rỗng, hiển thị "Không có ghi chú"
    const normalizeOneLine = (s) => (s || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').replace(/[\u0000-\u001F\u007F]+/g, '').trim();
    const note = normalizeOneLine(caption) || 'Không có ghi chú';
    
    // Lấy thông tin người gửi từ API data thay vì parse caption
    // (sẽ được truyền từ frontend qua API)
    
    // Escape HTML entities để tránh lỗi parse
    const escapeHtml = (text) => {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };
    
    // Tạo caption chi tiết
    const billCaption =`<b>CHECK HÓA ĐƠN MẤY NÍ ƠI</b>

📄 <b>Mã đơn:</b> ${escapeHtml(billId)}
👤 <b>Người gửi:</b> ${escapeHtml(employee)}
📝 <b>Ghi chú nội dung:</b> ${escapeHtml(note)}

Vui lòng chọn câu trả lời/请选择一个答案:`;
    
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
          ],
          [
            {
              text: '🟡已上分给其他系统/Đã lên điểm cho hệ thống khác',
              callback_data: `bill_response_${billId}_hethong`
            }
          ]
        ]
      }
    };

    
    // Gửi song song đến tất cả subgroups được chọn
    // Gửi song song đến các nhóm
    
    const sendPromises = groupsToSend.map(async (subGroup) => {
      try {
        // Convert telegramId to Number vì bot API cần Number
        const chatId = typeof subGroup.telegramId === 'string' 
          ? parseInt(subGroup.telegramId, 10) 
          : subGroup.telegramId;
        
        if (!chatId || isNaN(chatId)) {
          throw new Error(`Invalid telegramId: ${subGroup.telegramId}`);
        }
        
        const message = await bot.sendPhoto(chatId, imagePath, {
          caption: billCaption,
          parse_mode: 'HTML',
          ...keyboard
        });

        return {
          chatId: chatId, // Return Number chatId, not telegramId string
          groupName: subGroup.name,
          messageId: message.message_id,
          success: true
        };
      } catch (error) {
        console.error(`❌ Lỗi gửi đến ${subGroup.name} (chatId: ${chatId}):`, error.message);
        return {
          chatId: chatId, // Return Number chatId
          groupName: subGroup.name,
          success: false,
          error: error.message
        };
      }
    });

    // Chờ tất cả promises hoàn thành
    const results = await Promise.all(sendPromises);

    const successCount = results.filter(r => r.success).length;
    const failedResults = results.filter(r => !r.success);
    
    // Log chi tiết kết quả gửi
    console.log(`📤 Bill ${billId} - Tổng: ${results.length} nhóm, Thành công: ${successCount}, Thất bại: ${failedResults.length}`);
    
    // Log chi tiết các nhóm thất bại
    if (failedResults.length > 0) {
      console.log(`❌ Nhóm gửi thất bại cho bill ${billId}:`);
      failedResults.forEach(result => {
        console.log(`   - ${result.groupName}: ${result.error || 'Lỗi không xác định'}`);
      });
    }
    
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

// ==================== HÀM XỬ LÝ TIN NHẮN REPLY ====================
/**
 * Extract billId từ caption (format: "CHECK HÓA ĐƠN MẤY NÍ ƠI\n\n📄 Mã đơn: SH_26102025_5414\n...")
 */
function extractBillId(caption) {
  if (!caption) return null;
  
  // Pattern 1: HTML format "📄 <b>Mã đơn:</b> SH_26102025_5414"
  let match = caption.match(/📄\s*<b>Mã đơn:<\/b>\s*([^\n]+)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Pattern 2: Plain text "📄 Mã đơn: SH_26102025_5414"
  match = caption.match(/📄\s*Mã đơn:\s*([^\n]+)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Pattern 3: Just bill ID pattern SH_DATE_NUM
  match = caption.match(/\b(SH_\d{8}_\d+)\b/);
  if (match) {
    return match[1];
  }
  
  // Pattern 4: F8_, SH_, etc.
  match = caption.match(/\b([A-Z]\d+_\d{8}_\d+)\b/);
  if (match) {
    return match[1];
  }
  
  return null;
}

/**
 * Lưu tin nhắn reply vào database (nested structure)
 */
async function saveGroupMessage(msg) {
  try {
    console.log(`📩 [saveGroupMessage] Bắt đầu xử lý reply message từ ${msg.chat.title || msg.chat.id}`);
    
    const replyTo = msg.reply_to_message;
    
    if (!replyTo) {
      console.log('⚠️  Không có reply_to_message');
      return;
    }
    
    // Extract billId từ caption của tin nhắn được reply
    const caption = replyTo.caption || '';
    console.log(`📋 Caption đầu tiên:`, caption.substring(0, 150));
    
    const billId = extractBillId(caption);
    console.log(`🔍 Extracted billId:`, billId);
    
    if (!billId) {
      console.log('⚠️  Không extract được billId từ caption:', caption.substring(0, 100));
      return;
    }
    
    const groupName = msg.chat.title || `Group ${msg.chat.id}`;
    const chatId = msg.chat.id;
    const from = msg.from;
    
    // Tạo object tin nhắn mới
    const newMessage = {
      messageId: msg.message_id,
      replyToMessageId: replyTo.message_id,
      text: msg.text || msg.caption || '',
      from: {
        id: from.id,
        firstName: from.first_name,
        lastName: from.last_name,
        username: from.username
      },
      timestamp: new Date(msg.date * 1000)
    };
    
    // Tìm hoặc tạo BillConversation document
    let billConversation = await BillConversation.findOne({ billId: billId });
    
    if (!billConversation) {
      // Tạo document mới nếu chưa có
      billConversation = new BillConversation({ billId: billId, groups: [] });
    }
    
    // Tìm group trong mảng groups
    let groupIndex = billConversation.groups.findIndex(g => g.chatId === chatId);
    
    if (groupIndex === -1) {
      // Thêm group mới nếu chưa có
      billConversation.groups.push({
        chatId: chatId,
        groupName: groupName,
        messages: []
      });
      groupIndex = billConversation.groups.length - 1;
    }
    
    // Push tin nhắn mới vào mảng messages của group
    billConversation.groups[groupIndex].messages.push(newMessage);
    
    // Update timestamp
    billConversation.updatedAt = new Date();
    
    // Lưu document
    await billConversation.save();
    
    console.log(`📩 Đã lưu tin nhắn từ ${groupName} cho bill ${billId}`);
    
  } catch (error) {
    console.error('❌ Lỗi lưu tin nhắn reply:', error.message);
  }
}

// ==================== XỬ LÝ CALLBACK QUERIES ====================
// Store để track callback đã xử lý (tránh duplicate)
const processedCallbacks = new Set();

bot.on('callback_query', async (callbackQuery) => {
  const callbackId = callbackQuery.id;
  
  // ⚠️ QUAN TRỌNG: Kiểm tra duplicate TRƯỚC KHI đẩy vào queue
  // để tránh đẩy callback đã xử lý vào queue
  if (processedCallbacks.has(callbackId)) {
    await bot.answerCallbackQuery(callbackId, {
      text: 'Đã xử lý',
      show_alert: false
    });
    return;
  }
  
  // Đánh dấu callback đã nhận (nhưng chưa xử lý)
  processedCallbacks.add(callbackId);
  
  // Cleanup sau 2 phút để tránh memory leak
  setTimeout(() => {
    processedCallbacks.delete(callbackId);
  }, 120000);

  // ⚡ ĐẨY VÀO QUEUE ĐỂ XỬ LÝ TUẦN TỰ/SONG SONG TỐI ƯU
  // Queue sẽ tự động quản lý số lượng callbacks xử lý đồng thời
  // để tránh quá tải server và đảm bảo không mất dữ liệu
  inlineQueue.add(async () => {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const user = callbackQuery.from;

    try {
      // Kiểm tra xem có phải callback của bill không
      if (data.startsWith('bill_response_')) {
        // Parse callback data: bill_response_{billId}_{responseType}
        // Vì billId có thể chứa underscore, cần parse cẩn thận
        const parts = data.split('_');
        if (parts.length >= 4) {
          // Tìm responseType từ cuối (không phải diem, chua_diem, khong_phai, chua_tien)
          const possibleResponseTypes = ['diem', 'nhan_tien', 'khong_phai', 'chua_tien', 'hethong'];
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
          
          // Map response type to display text and status
          const responseMap = {
            'diem': { text: 'Đã lên điểm', emoji: '✅', status: 'YES' },
            'nhan_tien': { text: 'Nhận đc tiền', emoji: '💰', status: 'NHAN' },
            'khong_phai': { text: 'Không phải bên mình', emoji: '🚫', status: 'KHONG' },
            'chua_tien': { text: 'Chưa nhận đc tiền', emoji: '🚫', status: 'CHUA' },
            'hethong': { text: 'Đã lên điểm cho hệ thống khác', emoji: '🟡', status: 'HETHONG' }
          };
          
          const responseInfo = responseMap[responseType] || { text: 'Unknown', emoji: '❓', status: 'NO' };
          
          // Log để debug
          console.log(`🔄 Đang xử lý callback cho bill ${billId} từ chatId ${chatId}, response: ${responseInfo.text}`);
          
          // Lấy thông tin user
          const userName = user.first_name + (user.last_name ? ` ${user.last_name}` : '');

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
            
            // Retry mechanism chỉ khi lỗi
            let retryCount = 0;
            const maxRetries = 3;
            let success = false;
            
            while (retryCount < maxRetries && !success) {
              try {
                const response = await axios.post(`${BACKEND_URL}/api/telegram`, apiData, {
                  timeout: 10000 // 10 giây timeout
                });
                
                if (retryCount === 0) {
                  console.log(`✅ Đã gửi thành công callback cho bill ${billId} từ chatId ${chatId}`);
                } else {
                  console.log(`✅ Đã gửi thành công callback cho bill ${billId} từ chatId ${chatId} (retry ${retryCount})`);
                }
                success = true;
              } catch (apiError) {
                retryCount++;
                console.error(`❌ Lỗi gửi dữ liệu về backend cho bill ${billId} từ chatId ${chatId} (attempt ${retryCount}):`, apiError.message);
                
                if (retryCount < maxRetries) {
                  // Wait before retry: 1s, 2s
                  const waitTime = retryCount * 1000;
                  console.log(`⏳ Chờ ${waitTime}s trước khi thử lại...`);
                  await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                }
              }
            }
            
            if (!success) {
              console.error(`❌ Thất bại sau ${maxRetries} lần thử cho bill ${billId} từ chatId ${chatId}`);
            }
          } catch (retryError) {
            console.error(`❌ Lỗi retry mechanism cho bill ${billId} từ chatId ${chatId}:`, retryError.message);
          }

          // Trả lời callback query để tắt loading
          await bot.answerCallbackQuery(callbackQuery.id, {
            text: `Bạn đã chọn ${responseInfo.text}`,
            show_alert: false
          });

          // Edit caption để hiển thị đã chọn + ẩn inline keyboard
          try {
            const userName = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
            const originalCaption = callbackQuery.message.caption || '';
            
            // Strip HTML tags từ caption gốc
            const stripHtmlTags = (html) => {
              if (!html) return '';
              return html.replace(/<[^>]*>/g, '')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .trim();
            };
            
            // Tạo caption mới với plain text (không HTML) để tránh mọi lỗi
            const plainOriginal = stripHtmlTags(originalCaption);
            const newCaption = `${plainOriginal}\n\n${responseInfo.emoji} Chiến thần ${userName} đã chọn: ${responseInfo.text}`;
            
            // Check xem tin nhắn có ảnh không
            if (callbackQuery.message.photo) {
              try {
                // Thử edit caption với plain text
                await bot.editMessageCaption(newCaption, {
                  chat_id: chatId,
                  message_id: messageId,
                  reply_markup: { inline_keyboard: [] }
                });
              } catch (e) {
                // Nếu lỗi, chỉ xóa keyboard thôi
                console.log('⚠️  Không edit được caption, chỉ xóa keyboard:', e.message);
                await bot.editMessageReplyMarkup({
                  chat_id: chatId,
                  message_id: messageId,
                  reply_markup: { inline_keyboard: [] }
                });
              }
            } else {
              try {
                // Với text message, edit text
                await bot.editMessageText(newCaption, {
                  chat_id: chatId,
                  message_id: messageId,
                  reply_markup: { inline_keyboard: [] }
                });
              } catch (e) {
                // Nếu lỗi, chỉ xóa keyboard thôi
                console.log('⚠️  Không edit được text, chỉ xóa keyboard:', e.message);
                await bot.editMessageReplyMarkup({
                  chat_id: chatId,
                  message_id: messageId,
                  reply_markup: { inline_keyboard: [] }
                });
              }
            }
          } catch (e) {
            console.error(`Không thể ẩn inline keyboard cho message ${messageId}:`, e.message);
            // Nếu có lỗi, bỏ qua để không chặn luồng chính
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
  }).catch(async (error) => {
    // Xử lý lỗi từ queue (nếu timeout hoặc lỗi khác)
    console.error('❌ Lỗi queue xử lý callback:', error);
    // Đảm bảo callback query vẫn được trả lời ngay cả khi có lỗi
    try {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: 'Có lỗi xảy ra trong quá trình xử lý',
        show_alert: true
      });
    } catch (e) {
      console.error('❌ Không thể trả lời callback query:', e);
    }
  });

  // Log queue status chi tiết để debug
  console.log(`📥 Nhận callback ${callbackId}, Inline Queue: ${inlineQueue.size} chờ, ${inlineQueue.pending} xử lý`);
  
  if (inlineQueue.size > 5) {
    console.log(`⚠️  Inline Queue có nhiều callbacks: ${inlineQueue.size} đang chờ, ${inlineQueue.pending} đang xử lý`);
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
    
    // Xử lý tin nhắn reply cho bot
    if (msg.reply_to_message && msg.reply_to_message.from.is_bot) {
      console.log(`📩 Nhận reply message từ ${msg.chat.title || chatId}`);
      // Đẩy vào replyQueue để xử lý lưu tin nhắn (10 concurrent, nhanh hơn)
      replyQueue.add(async () => {
        await saveGroupMessage(msg);
      });
    }
    
    // Xử lý lệnh /help
    if (text && text.toLowerCase().includes('/help')) {
      console.log(`💬 /help từ ${msg.from.first_name} trong group ${msg.chat.title || chatId}`);
      bot.sendMessage(chatId, 
        `🤖 Bot hóa đơn siêu cấp vip bờ rồ\n\n` +
        `Chức năng:\n` +
        `• Gửi bill với ảnh kèm 5 nút thao tác\n` +
        `• Theo dõi phản hồi từ thành viên trong nhóm\n` +
        `• Kết quả trạng thái chính xác để thông báo khách hàng\n\n` +
        `• SHBET Nhà cái hàng đầu Châu Á hân hạnh được phục vụ\n\n` +
        `Liên hệ Moon để được hỗ trợ.`
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
