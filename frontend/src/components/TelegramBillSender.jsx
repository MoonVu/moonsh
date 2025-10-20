import React, { useState, useRef, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Input, 
  Upload, 
  Space, 
  Typography, 
  Divider,
  Alert,
  Spin,
  Modal,
  List,
  Tag,
  Timeline,
  Tooltip,
  Form,
  Select,
  Table,
  DatePicker,
  App,
  Image
} from 'antd';
import { 
  SendOutlined, 
  UploadOutlined, 
  PictureOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  DeleteOutlined,
  FileImageOutlined,
  ScissorOutlined,
  PlusOutlined,
  EditOutlined,
  TeamOutlined,
  FileTextOutlined,
  ZoomInOutlined
} from '@ant-design/icons';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import useSocket from '../hooks/useSocket';
import './TelegramBillSender.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const TelegramBillSender = () => {
  // Sử dụng App hook để lấy message instance
  const { message } = App.useApp();
  const { user } = useAuth();
  const { socket, isConnected, joinBillRoom, leaveBillRoom } = useSocket();
  
  // State cho popup "Thêm nhóm mới"
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupForm] = Form.useForm();
  const [groups, setGroups] = useState([]); // raw parent docs
  const [groupRows, setGroupRows] = useState([]); // flattened rows for table
  const [groupLoading, setGroupLoading] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [editingValues, setEditingValues] = useState({ name: '', telegramId: '' });
  
  // State cho popup "Thêm hóa đơn"
  const [showBillModal, setShowBillModal] = useState(false);
  const [billForm] = Form.useForm();
  const [billSubmitLoading, setBillSubmitLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [pasteEnabled, setPasteEnabled] = useState(true);
  
  // State chung
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  
  // State cho hiển thị danh sách hóa đơn
  const [billTab, setBillTab] = useState('my-bills'); // 'my-bills' hoặc 'all-bills'
  const [billSearchTerm, setBillSearchTerm] = useState('');
  const [bills, setBills] = useState([]);
  const [billResponses, setBillResponses] = useState({});
  
  // State để quản lý hiển thị "Xem thêm" cho từng bill
  const [expandedSentGroups, setExpandedSentGroups] = useState({});
  const [expandedResponses, setExpandedResponses] = useState({});
  const [billLoading, setBillLoading] = useState(false);
  
  // State cho modal hiển thị ghi chú đầy đủ
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [fullNote, setFullNote] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  
  // State cho popup xử lý trạng thái
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  
  // State bộ lọc theo trạng thái phản hồi và xử lý
  const [responseFilter, setResponseFilter] = useState(null); // null | 'NHAN' | 'CHUA'
  const [processedFilter, setProcessedFilter] = useState('ALL'); // 'ALL' | 'PROCESSED' | 'UNPROCESSED'
  
  // State cho pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalBills, setTotalBills] = useState(0);
  
  // State để force re-render danh sách nhóm
  const [selectedGroupType, setSelectedGroupType] = useState(null);
  

  // Load groups và bills khi component mount
  useEffect(() => {
    loadGroups();
    loadBillsWithFilter();
  }, []);

  // Load bills khi thay đổi tab hoặc search
  useEffect(() => {
    loadBillsWithFilter(1, pageSize); // Reset về trang 1 khi filter thay đổi
  }, [billTab, billSearchTerm, responseFilter, processedFilter]);

  // Listen Socket.IO events để cập nhật real-time
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen cho telegram response updates
    const handleTelegramResponseUpdate = (data) => {
      console.log('📡 Received telegram response update:', data);
      console.log('📡 Updated bill data:', data.updatedBill);
      
      // Cập nhật bills state
      setBills(prevBills => {
        const updatedBills = prevBills.map(bill => {
          if (bill.billId === data.billId) {
            console.log('📡 Updating bill:', bill.billId);
            
            // Cập nhật bill với data mới từ server
            const updatedBill = {
              ...bill,
              ...data.updatedBill,
              // Đảm bảo cập nhật đúng cấu trúc groups
              groups: data.updatedBill.groups || bill.groups
            };
            
            // Re-process data để tạo sentGroups và groupResponses
            const sentGroups = (updatedBill.groups || []).filter(g => g.status === 'PENDING').map(g => ({
              chatId: g.chatId,
              messageId: g.messageId,
              groupName: g.groupName,
              groupTelegramId: g.groupTelegramId
            }));
            
            const groupResponses = (updatedBill.groups || []).filter(g => g.status !== 'PENDING').map(g => ({
              chatId: g.chatId,
              groupName: g.groupName,
              status: g.status,
              responseUserId: g.responseUserId,
              responseUserName: g.responseUserName,
              responseType: g.responseType,
              responseTimestamp: g.responseTimestamp
            }));
            
            return {
              ...updatedBill,
              sentGroups,
              groupResponses
            };
          }
          return bill;
        });
        
        console.log('📡 Updated bills:', updatedBills);
        return updatedBills;
      });

      // Hiển thị notification với thông tin chi tiết hơn
      const statusText = {
        'YES': 'Đã lên điểm',
        'NHAN': 'Nhận đc tiền', 
        'CHUA': 'Chưa nhận được tiền',
        'KHONG': 'Không phải bên mình',
        'PENDING': 'Chờ phản hồi'
      };
      
      
    };

    // Đăng ký event listener
    socket.on('telegram-response-updated', handleTelegramResponseUpdate);

    // Cleanup khi component unmount
    return () => {
      socket.off('telegram-response-updated', handleTelegramResponseUpdate);
    };
  }, [socket, isConnected, message]);

  // Load danh sách groups
  const loadGroups = async () => {
    try {
      setGroupLoading(true);
      await apiService.ensureTelegramGroups();
      const res = await apiService.getTelegramGroups();
      const docs = res?.data || res?.data?.data || res || [];
      setGroups(docs);
      // flatten subGroups
      const rows = [];
      (docs || []).forEach(doc => {
        (doc.subGroups || []).forEach(sg => {
          rows.push({
            _id: sg._id,
            name: sg.name,
            telegramId: sg.telegramId,
            createdAt: sg.createdAt,
            createdBy: sg.createdBy,
            type: doc.type
          });
        });
      });
      setGroupRows(rows);
    } catch (error) {
      console.error('Lỗi khi load groups:', error);
      message.error('Lỗi khi tải danh sách nhóm!');
    } finally {
      setGroupLoading(false);
    }
  };

  // Load danh sách bills và responses
  const loadBills = async (page = currentPage, size = pageSize) => {
    try {
      setBillLoading(true);
      
      // Load bills theo trang từ API
      const responses = await apiService.getAllTelegramResponses({
        page: page,
        limit: size
      });
      console.log('🔍 API Response:', responses);
      
      // Parse dữ liệu từ API response
      let billsData = [];
      let paginationInfo = {};
      
      if (responses?.success && responses?.data) {
        if (responses.data.responses && Array.isArray(responses.data.responses)) {
          billsData = responses.data.responses;
          paginationInfo = responses.data.pagination || {};
        } else if (Array.isArray(responses.data)) {
          billsData = responses.data;
        }
      } else if (Array.isArray(responses)) {
        billsData = responses;
      }

      // Chuyển đổi dữ liệu từ format mới
      const billsArray = billsData.map(bill => ({
        billId: bill.billId,
        customer: bill.customer || 'N/A',
        employee: bill.employee || 'N/A',
        caption: bill.caption || '',
        imageUrl: bill.imageUrl || '',
        createdAt: bill.createdAt,
        createdBy: bill.createdBy || 'N/A',
        groupType: bill.groupType || '',
        groups: bill.groups || [],
        // Tách groups thành sentGroups và responses
        sentGroups: (bill.groups || []).filter(g => g.status === 'PENDING').map(g => ({
          chatId: g.chatId,
          messageId: g.messageId,
          groupName: g.groupName,
          groupTelegramId: g.groupTelegramId
        })),
        groupResponses: (bill.groups || []).filter(g => g.status !== 'PENDING').map(g => ({
          chatId: g.chatId,
          groupName: g.groupName,
          status: g.status,
          responseUserName: g.responseUserName,
          responseType: g.responseType,
          responseTimestamp: g.responseTimestamp,
          processor: g.processor,
          processTime: g.processTime
        }))
      }));
      
      // Sort theo ngày tạo (backend đã sort rồi, nhưng đảm bảo)
      billsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setBills(billsArray);
      setBillResponses(billsArray.reduce((acc, bill) => {
        acc[bill.billId] = bill;
        return acc;
      }, {}));
      
      // Cập nhật pagination info
      console.log('📊 Pagination info from API:', paginationInfo);
      console.log('📊 Bills loaded:', billsArray.length);
      setTotalBills(paginationInfo.total || billsArray.length);
      setCurrentPage(paginationInfo.page || page);
      
    } catch (error) {
      console.error('Lỗi khi load bills:', error);
      message.error('Lỗi khi tải danh sách hóa đơn!');
    } finally {
      setBillLoading(false);
    }
  };

  // Xử lý thay đổi trang
  const handlePageChange = (page, size) => {
    setCurrentPage(page);
    setPageSize(size);
    loadBillsWithFilter(page, size);
  };

  // Xử lý paste ảnh từ clipboard
  useEffect(() => {
    const handlePaste = (e) => {
      if (!pasteEnabled) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          
          const file = item.getAsFile();
          if (file) {
            handleFileUpload(file);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [pasteEnabled]);

  // Xử lý upload file
  const handleFileUpload = async (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Chỉ được upload file ảnh!');
      return false;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('File ảnh phải nhỏ hơn 10MB!');
      return false;
    }

    setSelectedFile(file);

    // Tạo URL preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);


    // Gọi OCR để autofill ghi chú (không chặn UI nếu lỗi)
    try {
      const ocrRes = await apiService.ocrImage(file);
      if (ocrRes?.success && ocrRes?.ocrText) {
        const normalizeOneLine = (s) => (s || '')
          .replace(/[\r\n]+/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/[\u0000-\u001F\u007F]+/g, '')
          .trim();
        const trimmed = normalizeOneLine(ocrRes.ocrText).slice(0, 800);
        const current = normalizeOneLine(billForm.getFieldValue('caption') || '');
        const newCaption = current ? current : trimmed; // ưu tiên nội dung hiện có, nếu rỗng dùng OCR
        billForm.setFieldsValue({ caption: newCaption });
        message.success('Tự động nhận diện nội dung hóa đơn');
      }
    } catch (e) {
      // Bỏ qua nếu OCR lỗi
    }

    return false; // Prevent default upload
  };

  // Xóa ảnh đã chọn
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ==================== XỬ LÝ NHÓM ====================
  
  // Thêm nhóm mới
  const handleAddGroup = async (values) => {
    try {
      setGroupLoading(true);
      
      // Kiểm tra ID Telegram đã tồn tại chưa
      const telegramIdExists = groupRows.some(row => 
        row.telegramId === values.telegramId
      );
      
      if (telegramIdExists) {
        message.error('ID Telegram đã tồn tại! Vui lòng nhập ID khác.');
        setGroupLoading(false);
        return;
      }
      
      await apiService.createSubGroup(values.type, { name: values.name, telegramId: values.telegramId });
      await loadGroups();
      groupForm.resetFields();
      message.success('Đã thêm nhóm mới thành công!');
      
    } catch (error) {
      console.error('Lỗi khi thêm nhóm:', error);
      message.error('Lỗi khi thêm nhóm!');
    } finally {
      setGroupLoading(false);
    }
  };

  // Sửa nhóm
  const handleEditGroup = (row) => {
    setEditingKey(row._id);
    setEditingValues({ name: row.name, telegramId: row.telegramId });
  };

  const handleSaveEdit = async (row) => {
    try {
      setGroupLoading(true);
      
      // Kiểm tra ID Telegram đã tồn tại chưa (trừ chính nó)
      const telegramIdExists = groupRows.some(existingRow => 
        existingRow.telegramId === editingValues.telegramId && 
        existingRow._id !== row._id
      );
      
      if (telegramIdExists) {
        message.error('ID Telegram đã tồn tại! Vui lòng nhập ID khác.');
        setGroupLoading(false);
        return;
      }
      
      await apiService.updateSubGroup(row.type, row._id, editingValues);
      setEditingKey(null);
      await loadGroups();
      message.success('Đã lưu nhóm!');
    } catch (e) {
      console.error(e);
      message.error('Lỗi khi lưu nhóm!');
    } finally {
      setGroupLoading(false);
    }
  };

  // Xóa nhóm
  const handleDeleteGroup = (row) => {
    Modal.confirm({
      title: 'Xóa nhóm',
      content: 'Bạn có chắc muốn xóa nhóm này?',
      onOk() {
        apiService.deleteSubGroup(row.type, row._id)
          .then(() => { loadGroups(); message.success('Đã xóa nhóm!'); })
          .catch(() => message.error('Lỗi khi xóa nhóm!'));
      }
    });
  };

  // ==================== XỬ LÝ HÓA ĐƠN ====================
  
  // Tạo mã đơn tự động
  const generateBillId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomNumber = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    
    return `SH_${day}${month}${year}_${randomNumber}`;
  };

  // Gửi hóa đơn
  const handleSendBill = async (values) => {
    if (!selectedFile) {
      message.error('Vui lòng upload ảnh hóa đơn!');
      return;
    }

    try {
      setBillSubmitLoading(true);
      
      // Tạo mã đơn tự động
      const billId = generateBillId();
      
      // Tạo FormData
      const formDataToSend = new FormData();
      formDataToSend.append('billId', billId);
      formDataToSend.append('customer', values.customer);
      formDataToSend.append('employee', values.employee);
      formDataToSend.append('groupType', values.groupType);
      const formSelectedGroups = values.selectedGroups || [];
      // Nếu không chọn nhóm cụ thể, sẽ gửi cho tất cả nhóm thuộc groupType
      formDataToSend.append('selectedGroups', JSON.stringify(formSelectedGroups));
      // Chỉ gửi phần ghi chú người dùng thấy trên form (đã được OCR tự điền), không thêm tiêu đề
      const pureCaption = (values.caption || '').replace(/\s+/g, ' ').trim();
      formDataToSend.append('caption', pureCaption);
      formDataToSend.append('image', selectedFile);

      const response = await apiService.sendBill(formDataToSend);

      if (response.success) {
        message.success(`Đã gửi hóa đơn thành công! Mã đơn: ${billId}`);
        billForm.resetFields();
        setSelectedFile(null);
        setPreviewUrl('');
        setSelectedGroupType(null);
        setShowBillModal(false);
        // Reload danh sách bills
        await loadBillsWithFilter();
      } else {
        message.error('Lỗi gửi hóa đơn: ' + response.error);
      }
      
    } catch (error) {
      console.error('Lỗi gửi hóa đơn:', error);
      message.error('Lỗi gửi hóa đơn: ' + error.message);
    } finally {
      setBillSubmitLoading(false);
    }
  };

  // Load bills với filter (sẽ gọi API với params)
  const loadBillsWithFilter = async (page = 1, size = pageSize) => {
    try {
      setBillLoading(true);
      
      // Thêm filter theo search term để kiểm tra xem có phải tìm theo trạng thái không
      const searchLower = billSearchTerm.toLowerCase();
      const statusKeywords = {
        'đã lên điểm': 'YES',
        'lên điểm': 'YES',
        'nhận đc tiền': 'NHAN',
        'nhận được tiền': 'NHAN',
        'chưa nhận được tiền': 'CHUA',
        'chưa nhận': 'CHUA',
        'không phải bên mình': 'KHONG',
        'không phải': 'KHONG',
        'chờ phản hồi': 'PENDING',
        'pending': 'PENDING'
      };
      
      // Kiểm tra xem search term có chứa từ khóa trạng thái không
      let searchStatus = null;
      for (const [keyword, status] of Object.entries(statusKeywords)) {
        if (searchLower.includes(keyword.toLowerCase())) {
          searchStatus = status;
          break;
        }
      }
      
      // Tạo params cho API
      const params = {
        page: page,
        limit: size
      };
      
      // Thêm filter theo tab
      if (billTab === 'my-bills' && user?.username) {
        params.createdBy = user.username;
      }
      
      // Thêm filter theo trạng thái phản hồi (từ nút filter)
      if (responseFilter) {
        params.status = responseFilter;
      }
      
      // Thêm filter theo trạng thái xử lý
      if (processedFilter && processedFilter !== 'ALL') {
        params.processed = processedFilter;
      }
      
      // Chỉ gửi search lên API nếu không phải tìm theo trạng thái
      if (billSearchTerm && !searchStatus) {
        params.search = billSearchTerm;
      }
      
      // Nếu tìm theo trạng thái từ search box, gửi status lên server
      if (searchStatus) {
        params.status = searchStatus;
      }
      
      // Load bills từ API với filters
      const responses = await apiService.getAllTelegramResponses(params);
      
      
      // Parse dữ liệu từ API response
      let billsData = [];
      let paginationInfo = {};
      
      if (responses?.success && responses?.data) {
        if (responses.data.responses && Array.isArray(responses.data.responses)) {
          billsData = responses.data.responses;
          paginationInfo = responses.data.pagination || {};
        } else if (Array.isArray(responses.data)) {
          billsData = responses.data;
        }
      } else if (Array.isArray(responses)) {
        billsData = responses;
      }

      // Chuyển đổi dữ liệu từ format mới
      let billsArray = billsData.map(bill => ({
        billId: bill.billId,
        customer: bill.customer || 'N/A',
        employee: bill.employee || 'N/A',
        caption: bill.caption || '',
        imageUrl: bill.imageUrl || '',
        createdAt: bill.createdAt,
        createdBy: bill.createdBy || 'N/A',
        groupType: bill.groupType || '',
        groups: bill.groups || [],
        // Tách groups thành sentGroups và responses
        sentGroups: (bill.groups || []).filter(g => g.status === 'PENDING').map(g => ({
          chatId: g.chatId,
          messageId: g.messageId,
          groupName: g.groupName,
          groupTelegramId: g.groupTelegramId
        })),
        groupResponses: (bill.groups || []).filter(g => g.status !== 'PENDING').map(g => ({
          chatId: g.chatId,
          groupName: g.groupName,
          status: g.status,
          responseUserName: g.responseUserName,
          responseType: g.responseType,
          responseTimestamp: g.responseTimestamp,
          processor: g.processor,
          processTime: g.processTime
        }))
      }));
      
      // Sort theo ngày tạo (backend đã sort rồi, nhưng đảm bảo)
      billsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setBills(billsArray);
      setBillResponses(billsArray.reduce((acc, bill) => {
        acc[bill.billId] = bill;
        return acc;
      }, {}));
      
      // Cập nhật pagination info
      setTotalBills(paginationInfo.total || billsArray.length);
      setCurrentPage(paginationInfo.page || page);
      
    } catch (error) {
      console.error('Lỗi khi load bills:', error);
      message.error('Lỗi khi tải danh sách hóa đơn!');
    } finally {
      setBillLoading(false);
    }
  };

  // Server-side pagination: chỉ trả về bills của trang hiện tại
  const getFilteredBills = () => {
    // Với server-side pagination, bills đã là data của trang hiện tại
    // Không cần slice thêm vì backend đã trả về đúng page
    return bills;
  };

  // Function để mở modal hiển thị ghi chú đầy đủ
  const showFullNote = (caption, billId) => {
    // Parse note từ caption format: "📋 Hóa đơn {customer}\r\n\r\n{note}"
    const noteMatch = caption?.match(/\r?\n\r?\n(.+)$/);
    const note = noteMatch ? noteMatch[1].trim() : (caption || 'Không có ghi chú');
    
    setFullNote(note);
    setNoteTitle(`Ghi chú - Mã đơn: ${billId}`);
    setShowNoteModal(true);
  };

  // Function để mở popup xử lý trạng thái
  const handleStatusClick = (response, bill) => {
    // Chỉ cho phép click vào CHUA hoặc NHAN
    if (response.status === 'CHUA' || response.status === 'NHAN') {
      setSelectedResponse(response);
      setSelectedBill(bill);
      setShowProcessModal(true);
    }
  };

  // Function để xử lý thay đổi trạng thái
  const handleProcessStatus = async (processed) => {
    if (!selectedResponse || !selectedBill || !processed) {
      setShowProcessModal(false);
      return;
    }

    try {
      const newStatus = selectedResponse.status === 'NHAN' ? 'NHAN_PROCESSED' : 'CHUA_PROCESSED';
      
      // Gọi API để update trạng thái
      await apiService.updateResponseStatus({
        billId: selectedBill.billId,
        chatId: selectedResponse.chatId,
        newStatus: newStatus,
        processor: user?.username || 'Unknown',
        processTime: new Date().toISOString()
      });

      message.success('Đã cập nhật trạng thái thành công!');
      
      // Reload bills để cập nhật UI
      await loadBillsWithFilter(currentPage, pageSize);
      
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái:', error);
      message.error('Lỗi khi cập nhật trạng thái!');
    } finally {
      setShowProcessModal(false);
      setSelectedResponse(null);
      setSelectedBill(null);
    }
  };

  // Get response status cho một bill
  const getResponseStatus = (bill) => {
    const groupResponses = bill.groupResponses || [];
    const yesCount = groupResponses.filter(gr => gr.status === 'YES').length;
    const nhanCount = groupResponses.filter(gr => gr.status === 'NHAN').length;
    const noCount = groupResponses.filter(gr => gr.status === 'NO').length;
    const pendingCount = groupResponses.filter(gr => gr.status === 'PENDING').length;
    
    if (yesCount > 0) return { type: 'yes', count: yesCount, pending: pendingCount };
    if (nhanCount > 0) return { type: 'nhan', count: nhanCount, pending: pendingCount };
    if (noCount > 0) return { type: 'no', count: noCount, pending: pendingCount };
    if (pendingCount > 0) return { type: 'pending', count: pendingCount };
    return { type: 'none', count: 0 };
  };

  // Columns cho bảng groups
  const groupColumns = [
    {
      title: 'Tên nhóm',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        editingKey === record._id ? (
          <Input 
            value={editingValues.name} 
            onChange={(e)=>setEditingValues(v=>({...v,name:e.target.value}))}
            style={{ minWidth: 180 }}
          />
        ) : <span style={{ whiteSpace: 'nowrap' }}><Text strong>{text}</Text></span>
      )
    },
    {
      title: 'ID Telegram',
      dataIndex: 'telegramId',
      key: 'telegramId',
      render: (text, record) => (
        editingKey === record._id ? (
          <Input 
            value={editingValues.telegramId} 
            onChange={(e)=>setEditingValues(v=>({...v,telegramId:e.target.value}))}
            style={{ minWidth: 100 }}
          />
        ) : <span style={{ whiteSpace: 'nowrap' }}><Text code>{text}</Text></span>
      )
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'SHBET' ? 'blue' : 'green'}>
          {type === 'SHBET' ? 'SHBET' : 'Bên thứ 3'}
        </Tag>
      )
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => <span style={{ whiteSpace: 'nowrap' }}>{new Date(date).toLocaleString('vi-VN')}</span>
    },
    {
      title: 'Người tạo',
      dataIndex: 'createdBy',
      key: 'createdBy'
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {editingKey === record._id ? (
            <>
              <Button type="link" className="btn-save" onClick={()=>handleSaveEdit(record)}>Lưu</Button>
              <Button type="link" className="btn-cancel" onClick={()=>setEditingKey(null)}>Hủy</Button>
            </>
          ) : (
            <Button 
              type="link" 
              className="btn-edit"
              icon={<EditOutlined />}
              onClick={() => handleEditGroup(record)}
            >
              Sửa
            </Button>
          )}
          {/* Xóa chỉ hiển thị khi không ở chế độ Lưu/Hủy hoặc luôn cho phép tùy bạn */}
          <Button type="link" className="btn-delete" icon={<DeleteOutlined />} onClick={() => handleDeleteGroup(record)}>Xóa</Button>
        </Space>
      )
    }
  ];

  // Columns cho bảng bills
  const billColumns = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1
    },
    {
      title: 'Hình ảnh hóa đơn',
      key: 'image',
      width: 100,
      render: (_, record) => (
        record.imageUrl ? (
          <Image
            src={`${apiService.baseURL}${record.imageUrl}`}
            alt="Bill"
            width={60}
            height={60}
            style={{ 
              objectFit: 'cover',
              borderRadius: 8,
              border: '1px solid #d9d9d9'
            }}
            preview={{
              mask: <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ZoomInOutlined />
                <span>Xem ảnh</span>
              </div>
            }}
          />
        ) : (
          <div style={{ 
            width: 60, 
            height: 60, 
            background: '#f5f5f5',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '10px',
            textAlign: 'center'
          }}>
            No Image
          </div>
        )
      )
    },
    {
      title: 'Người tạo',
      key: 'creator',
      width: 150,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.createdBy}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {new Date(record.createdAt).toLocaleString('vi-VN')}
          </div>
        </div>
      )
    },
    {
      title: 'ID Khách hàng',
      dataIndex: 'customer',
      key: 'customer',
      width: 120
    },
    {
      title: 'Mã đơn',
      dataIndex: 'billId',
      key: 'billId',
      width: 180,
      render: (text) => (
        <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
          <Text code>{text}</Text>
        </span>
      )
    },
    {
      title: 'Ghi chú',
      dataIndex: 'caption',
      key: 'caption',
      width: 200,
      ellipsis: true,
      render: (caption, record) => {
        // Parse note từ caption format: "📋 Hóa đơn {customer}\r\n\r\n{note}"
        const noteMatch = caption?.match(/\r?\n\r?\n(.+)$/);
        const note = noteMatch ? noteMatch[1].trim() : (caption || 'Không có ghi chú');
        
        return (
          <Tooltip title="Click để xem ghi chú đầy đủ">
            <span 
              style={{ 
                cursor: 'pointer', 
                color: '#1890ff',
                textDecoration: 'underline'
              }}
              onClick={() => showFullNote(caption, record.billId)}
            >
              {note}
            </span>
          </Tooltip>
        );
      }
    },
    {
      title: 'Nhóm đã gửi',
      key: 'sentGroups',
      width: 200,
      render: (_, record) => {
        const sentGroups = record.sentGroups || [];
        const billId = record.billId;
        const showAllSent = expandedSentGroups[billId] || false;
        
        if (sentGroups.length === 0) {
          return <Tag color="default">Không còn nhóm nào</Tag>;
        }
        
        const displayedGroups = showAllSent ? sentGroups : sentGroups.slice(0, 3);
        const hasMore = sentGroups.length > 3;
        
        return (
          <div>
            {displayedGroups.map((group, index) => (
              <Tag key={index} color="default" style={{ margin: '2px', display: 'block' }}>
                {group.groupName || 'Unknown Group'}
              </Tag>
            ))}
            {hasMore && !showAllSent && (
              <Button 
                type="link" 
                size="small" 
                onClick={() => setExpandedSentGroups(prev => ({ ...prev, [billId]: true }))}
                style={{ padding: '2px 0', fontSize: '11px' }}
              >
                Xem thêm ({sentGroups.length - 3})
              </Button>
            )}
            {hasMore && showAllSent && (
              <Button 
                type="link" 
                size="small" 
                onClick={() => setExpandedSentGroups(prev => ({ ...prev, [billId]: false }))}
                style={{ padding: '2px 0', fontSize: '11px' }}
              >
                Thu gọn
              </Button>
            )}
          </div>
        );
      }
    },
    {
      title: 'Nhóm đã phản hồi',
      key: 'responses',
      width: 450,
      minWidth: 400,
      render: (_, record) => {
        const groupResponses = record.groupResponses || [];
        const billId = record.billId;
        const showAllResponses = expandedResponses[billId] || false;
        
        // Sort groups: YES > NHAN > NHAN_PROCESSED > CHUA_PROCESSED > HETHONG > CHUA > KHONG > NO > PENDING
        const sortedGroups = [...groupResponses].sort((a, b) => {
          const order = { 'YES': 1, 'NHAN': 2, 'NHAN_PROCESSED': 3, 'CHUA_PROCESSED': 4, 'HETHONG': 5, 'CHUA': 6, 'KHONG': 7, 'NO': 8, 'PENDING': 9 };
          return (order[a.status] || 9) - (order[b.status] || 9);
        });
        
        if (sortedGroups.length === 0) {
          return <Tag color="default">Chưa có phản hồi</Tag>;
        }
        
        const displayedGroups = showAllResponses ? sortedGroups : sortedGroups.slice(0, 3);
        const hasMore = sortedGroups.length > 3;
        
        return (
          <div>
            {displayedGroups.map((gr, index) => {
              let color = 'default';
              let text = gr.groupName;
              let emoji = '';
              
              // Map status to display
              const statusMap = {
                'YES': { emoji: '✅', text: 'Đã lên điểm', color: 'green' },
                'NHAN': { emoji: '💰', text: 'Nhận đc tiền', color: 'blue', clickable: true },
                'CHUA': { emoji: '🚫', text: 'Chưa nhận được tiền', color: 'orange', clickable: true },
                'KHONG': { emoji: '🚫', text: 'Không phải bên mình', color: 'red' },
                'HETHONG': { emoji: '🟡', text: 'Đã lên điểm cho hệ thống khác', color: 'yellow' },
                'PENDING': { emoji: '⏳', text: 'Chờ phản hồi', color: 'orange' },
                'NHAN_PROCESSED': { emoji: '✅💰', text: 'Nhận đc tiền - Đã xử lý', color: 'green' },
                'CHUA_PROCESSED': { emoji: '✅🚫', text: 'Chưa nhận được tiền - Đã xử lý', color: 'green' }
              };
              
              const statusInfo = statusMap[gr.status] || { emoji: '❓', text: 'Unknown', color: 'default' };
              color = statusInfo.color;
              
              // Thêm thông tin người xử lý nếu có
              let displayText = statusInfo.text;
              if ((gr.status === 'NHAN_PROCESSED' || gr.status === 'CHUA_PROCESSED') && gr.processor) {
                const processTime = gr.processTime ? new Date(gr.processTime) : null;
                if (processTime) {
                  const dateStr = processTime.toLocaleDateString('vi-VN');
                  const timeStr = processTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                  displayText += ` (${gr.processor} - ${dateStr} ${timeStr})`;
                } else {
                  displayText += ` (${gr.processor})`;
                }
              }
              

              
              text = `${statusInfo.emoji} ${gr.groupName} - ${displayText}`;
              
              // Kiểm tra xem có thể click không
              const isClickable = statusInfo.clickable && (gr.status === 'CHUA' || gr.status === 'NHAN');
              
              return (
                <Tag 
                  key={index} 
                  color={color} 
                  style={{ 
                    margin: '2px', 
                    display: 'block',
                    cursor: isClickable ? 'pointer' : 'default',
                    maxWidth: '100%',
                    wordBreak: 'break-word',
                    whiteSpace: 'normal',
                    height: 'auto',
                    minHeight: '32px',
                    padding: '4px 8px'
                  }}
                  onClick={isClickable ? () => handleStatusClick(gr, record) : undefined}
                >
                  {text}
                </Tag>
              );
            })}
            {hasMore && !showAllResponses && (
              <Button 
                type="link" 
                size="small" 
                onClick={() => setExpandedResponses(prev => ({ ...prev, [billId]: true }))}
                style={{ padding: '2px 0', fontSize: '11px' }}
              >
                Xem thêm ({sortedGroups.length - 3})
              </Button>
            )}
            {hasMore && showAllResponses && (
              <Button 
                type="link" 
                size="small" 
                onClick={() => setExpandedResponses(prev => ({ ...prev, [billId]: false }))}
                style={{ padding: '2px 0', fontSize: '11px' }}
              >
                Thu gọn
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="telegram-bill-sender">
      <Card title={
        <Space>
          <PictureOutlined />
          <span>Quản lý Hóa đơn Telegram</span>
        </Space>
      }>
        
        {/* Thông tin hướng dẫn */}
        <Alert
          message="Hế lu"
          description={
            <div>
              <p> <strong>Đây là bản thử nghiệm nên nếu mọi người cần cập nhật gì thêm cứ nói cho Moon nha. Khung giờ làm việc của BOT: giống giờ Moon đi làm.</strong> </p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 2 nút chính */}
        <div className="main-action-buttons">
          {user?.role?.name === 'ADMIN' && (
            <Button
              type="primary"
              size="large"
              icon={<TeamOutlined />}
              onClick={() => setShowGroupModal(true)}
              className="group-button"
            >
              Thêm nhóm mới
            </Button>
          )}
          
          <Button
            type="primary"
            size="large"
            icon={<FileTextOutlined />}
            onClick={() => setShowBillModal(true)}
            className="bill-button"
          >
            Thêm hóa đơn
          </Button>
        </div>

        {/* Phần hiển thị danh sách hóa đơn */}
        <Divider />
        
        <div style={{ marginTop: 24 }}>
          <Title level={4}>Danh sách Hóa đơn</Title>
          
          {/* Công cụ tìm kiếm */}
          <div style={{ marginBottom: 16 }}>
            <Input.Search
              placeholder="Tìm kiếm theo mã đơn, khách hàng, ghi chú, hoặc trạng thái phản hồi (VD: 'chưa nhận được tiền' sẽ hiện cả đã xử lý)..."
              value={billSearchTerm}
              onChange={(e) => setBillSearchTerm(e.target.value)}
              style={{ maxWidth: 600 }}
              allowClear
            />
            
            {/* Hiển thị thông báo khi tìm kiếm theo trạng thái */}
            {billSearchTerm && (() => {
              const searchLower = billSearchTerm.toLowerCase();
              const statusKeywords = {
                'đã lên điểm': 'YES',
                'lên điểm': 'YES',
                'nhận đc tiền': 'NHAN',
                'nhận được tiền': 'NHAN',
                'chưa nhận được tiền': 'CHUA',
                'chưa nhận': 'CHUA',
                'không phải bên mình': 'KHONG',
                'không phải': 'KHONG',
                'chờ phản hồi': 'PENDING',
                'pending': 'PENDING',
                'đã xử lý': 'PROCESSED'
              };
              
              let searchStatus = null;
              for (const [keyword, status] of Object.entries(statusKeywords)) {
                if (searchLower.includes(keyword.toLowerCase())) {
                  searchStatus = status;
                  break;
                }
              }
              
              if (searchStatus) {
                const statusText = {
                  'YES': 'đã lên điểm',
                  'NHAN': 'nhận được tiền (bao gồm cả đã xử lý)',
                  'CHUA': 'chưa nhận được tiền (bao gồm cả đã xử lý)',
                  'KHONG': 'không phải bên mình',
                  'PENDING': 'chờ phản hồi',
                  'PROCESSED': 'đã xử lý'
                };
                
                return (
                  <div style={{ marginTop: 8, fontSize: '12px', color: '#1890ff' }}>
                    🔍 Đang tìm kiếm hóa đơn có trạng thái: <strong>{statusText[searchStatus]}</strong>
                  </div>
                );
              }
              return null;
            })()}
          </div>
          
          {/* Tabs lọc */}
          <div style={{ marginBottom: 16 }}>
            <Space wrap>
              <Button 
                type={billTab === 'my-bills' ? 'primary' : 'default'}
                onClick={() => setBillTab('my-bills')}
              >
                Hóa đơn của tôi
              </Button>
              <Button 
                type={billTab === 'all-bills' ? 'primary' : 'default'}
                onClick={() => setBillTab('all-bills')}
              >
                Toàn bộ
              </Button>
              {/* Tabs phản hồi: Nhận được tiền / Chưa nhận được tiền */}
              <Button 
                type={responseFilter === 'NHAN' ? 'primary' : 'default'}
                onClick={() => setResponseFilter(prev => prev === 'NHAN' ? null : 'NHAN')}
              >
                Nhận được tiền
              </Button>
              <Button 
                type={responseFilter === 'CHUA' ? 'primary' : 'default'}
                onClick={() => setResponseFilter(prev => prev === 'CHUA' ? null : 'CHUA')}
              >
                Chưa nhận được tiền
              </Button>
              {/* Dropdown lọc Đã xử lý / Chưa xử lý */}
              <Select 
                value={processedFilter}
                style={{ width: 200 }}
                onChange={setProcessedFilter}
              >
                <Option value="ALL">Tất cả (đã xử lý + chưa xử lý)</Option>
                <Option value="PROCESSED">Chỉ Đã xử lý</Option>
                <Option value="UNPROCESSED">Chỉ Chưa xử lý</Option>
              </Select>
            </Space>
          </div>
          
          {/* Bảng thống kê */}
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <Table
              columns={billColumns}
              dataSource={getFilteredBills()}
              rowKey="billId"
              size="small"
              loading={billLoading}
              pagination={{ 
                current: currentPage,
                pageSize: pageSize,
                total: totalBills,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} hóa đơn`,
                onChange: handlePageChange,
                onShowSizeChange: handlePageChange,
                pageSizeOptions: ['10', '20', '50', '100'],
                // Server-side pagination: không để Ant Design tự slice data
                hideOnSinglePage: false,
                showLessItems: true
              }}
              scroll={{ x: 1450 }}
              locale={{
                emptyText: 'Chưa có hóa đơn nào'
              }}
              style={{ minWidth: '1450px' }}
            />
          </div>
        </div>

        {/* Popup Thêm nhóm mới - chỉ hiển thị cho ADMIN */}
        {user?.role?.name === 'ADMIN' && (
          <Modal
            title={
              <Space>
                <TeamOutlined />
                <span>Thêm nhóm mới</span>
              </Space>
            }
            open={showGroupModal}
          onCancel={() => {
            setShowGroupModal(false);
            groupForm.resetFields();
          }}
          footer={null}
          width={1500}
        >
          <div style={{ display: 'flex', gap: 15 }}>
            {/* Form thêm nhóm */}
            <div style={{ flex: '0 0 360px', maxWidth: 230 }}>
              <Form
                form={groupForm}
                layout="vertical"
                onFinish={handleAddGroup}
              >
                <Form.Item
                  label="Tên nhóm"
                  name="name"
                  rules={[{ required: true, message: 'Vui lòng nhập tên nhóm!' }]}
                >
                  <Input placeholder="Nhập tên nhóm..." />
                </Form.Item>

                <Form.Item
                  label="ID Telegram"
                  name="telegramId"
                  rules={[
                    { required: true, message: 'Vui lòng nhập ID Telegram!' },
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve();
                        
                        const exists = groupRows.some(row => row.telegramId === value);
                        if (exists) {
                          return Promise.reject(new Error('ID Telegram đã tồn tại!'));
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <Input placeholder="Ví dụ: -1001234567890" />
                </Form.Item>

                <Form.Item
                  label="Loại nhóm"
                  name="type"
                  rules={[{ required: true, message: 'Vui lòng chọn loại nhóm!' }]}
                >
                  <Select placeholder="Chọn loại nhóm">
                    <Option value="SHBET">Hóa đơn SHBET</Option>
                    <Option value="THIRD_PARTY">Hóa đơn bên thứ 3</Option>
                  </Select>
                </Form.Item>

                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={groupLoading}
                    block
                    size="large"
                  >
                    Thêm nhóm
                  </Button>
                </Form.Item>
              </Form>
            </div>

            {/* Bảng thống kê nhóm */}
            <div style={{ flex: 1 }}>
              <Title level={5}>Danh sách nhóm</Title>
              <Table
                columns={groupColumns}
                dataSource={groupRows}
                rowKey="_id"
                size="small"
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1000 }}
                loading={groupLoading}
              />
            </div>
          </div>
          </Modal>
        )}

        {/* Popup Thêm hóa đơn */}
        <Modal
          title={
            <Space>
              <FileTextOutlined />
              <span>Thêm hóa đơn</span>
            </Space>
          }
          open={showBillModal}
          onCancel={() => {
            setShowBillModal(false);
            billForm.resetFields();
            setSelectedFile(null);
            setPreviewUrl('');
            setSelectedGroupType(null);
          }}
          footer={null}
          width={700}
        >
          <Form
            form={billForm}
            layout="vertical"
            onFinish={handleSendBill}
          >
            <Form.Item
              label="Khách hàng"
              name="customer"
              rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng!' }]}
            >
              <Input placeholder="Nhập tên khách hàng..." />
            </Form.Item>

            <Form.Item
              label="Nhân viên"
              name="employee"
              initialValue={user?.username || 'Moon'}
            >
              <Input disabled />
            </Form.Item>

            <Form.Item
              label="Loại nhóm"
              name="groupType"
              rules={[{ required: true, message: 'Vui lòng chọn loại nhóm!' }]}
            >
              <Select 
                placeholder="Chọn loại nhóm để gửi"
                onChange={(value) => {
                  // Reset selectedGroups khi thay đổi groupType
                  billForm.setFieldsValue({ selectedGroups: [] });
                  // Cập nhật state để force re-render danh sách nhóm
                  setSelectedGroupType(value);
                }}
              >
                <Option value="SHBET">Hóa đơn SHBET</Option>
                <Option value="THIRD_PARTY">Hóa đơn bên thứ 3</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Chọn nhóm cụ thể - Để trống là gửi tất cả"
              name="selectedGroups"
              help="Để trống sẽ gửi cho tất cả nhóm thuộc loại đã chọn"
            >
              <Select
                mode="multiple"
                placeholder="Chọn nhóm cụ thể (để trống = gửi tất cả)"
                style={{ width: '100%' }}
                optionLabelProp="label"
                allowClear
                disabled={!selectedGroupType}
                key={selectedGroupType} // Force re-render khi thay đổi groupType
                showSearch
                filterOption={(input, option) => {
                  const label = option?.label || '';
                  const value = option?.value || '';
                  return label.toLowerCase().includes(input.toLowerCase()) || 
                         value.toLowerCase().includes(input.toLowerCase());
                }}
              >
                {groups
                  .find(g => g.type === selectedGroupType)
                  ?.subGroups?.map(subGroup => (
                    <Option 
                      key={subGroup._id} 
                      value={subGroup._id}
                      label={subGroup.name}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{subGroup.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          ID: {subGroup.telegramId}
                        </div>
                      </div>
                    </Option>
                  ))
                }
              </Select>
            </Form.Item>

            <Form.Item label="Ảnh hóa đơn">
              <div style={{ marginBottom: 8 }}>
                <Text strong>Upload ảnh:</Text>
              </div>
              
              <Space>
                <Upload
                  ref={fileInputRef}
                  beforeUpload={handleFileUpload}
                  showUploadList={false}
                  accept="image/*"
                >
                  <Button icon={<UploadOutlined />}>
                    Chọn từ máy tính
                  </Button>
                </Upload>
                
                <Button 
                  icon={<ScissorOutlined />}
                  onClick={() => {
                    message.info('Nhấn Ctrl+V để paste ảnh từ clipboard');
                  }}
                >
                  Paste ảnh (Ctrl+V)
                </Button>
              </Space>
              
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                💡 Có thể dán ảnh từ các ứng dụng hoặc tải ảnh lên.
              </div>
              
              {previewUrl && (
                <div style={{ marginTop: 16 }}>
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    style={{ 
                      maxWidth: 200, 
                      maxHeight: 200, 
                      border: '1px solid #d9d9d9',
                      borderRadius: 6
                    }} 
                  />
                  <br />
                  <Button 
                    type="link" 
                    danger 
                    icon={<DeleteOutlined />}
                    onClick={handleRemoveImage}
                    style={{ marginTop: 8 }}
                  >
                    Xóa ảnh
                  </Button>
                </div>
              )}
            </Form.Item>

            <Form.Item
              label="Ghi chú (tùy chọn)"
              name="caption"
            >
              <TextArea
                placeholder="Nhập ghi chú cho hóa đơn..."
                rows={3}
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={billSubmitLoading}
                disabled={!selectedFile}
                block
                size="large"
                icon={<SendOutlined />}
              >
                {billLoading ? 'Đang gửi...' : 'Gửi hóa đơn'}
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal hiển thị ghi chú đầy đủ */}
        <Modal
          title={noteTitle}
          open={showNoteModal}
          onCancel={() => setShowNoteModal(false)}
          footer={[
            <Button key="close" onClick={() => setShowNoteModal(false)}>
              Đóng
            </Button>
          ]}
          width={600}
        >
          <div style={{ 
            maxHeight: '400px', 
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '14px',
            lineHeight: '1.6',
            padding: '16px',
            background: '#fafafa',
            borderRadius: '6px',
            border: '1px solid #f0f0f0'
          }}>
            {fullNote}
          </div>
        </Modal>

        {/* Modal xử lý trạng thái */}
        <Modal
          title="Xử lý trạng thái phản hồi"
          open={showProcessModal}
          onCancel={() => setShowProcessModal(false)}
          footer={[
            <Button key="cancel" onClick={() => setShowProcessModal(false)}>
              Chưa xử lý
            </Button>,
            <Button key="process" type="primary" onClick={() => handleProcessStatus(true)}>
              Đã xử lý
            </Button>
          ]}
          width={500}
        >
          {selectedResponse && selectedBill && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Text strong>Thông tin phản hồi:</Text>
              </div>
              
              <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
                <div><Text strong>Nhóm:</Text> {selectedResponse.groupName}</div>
                <div><Text strong>Trạng thái hiện tại:</Text> 
                  {selectedResponse.status === 'NHAN' ? ' 💰 Nhận đc tiền' : ' 🚫 Chưa nhận được tiền'}
                </div>
                <div><Text strong>Mã đơn:</Text> {selectedBill.billId}</div>
                {selectedResponse.responseUserName && (
                  <div><Text strong>Người phản hồi:</Text> {selectedResponse.responseUserName}</div>
                )}
                {selectedResponse.responseTimestamp && (
                  <div><Text strong>Thời gian phản hồi:</Text> {new Date(selectedResponse.responseTimestamp).toLocaleString('vi-VN')}</div>
                )}
                {selectedResponse.processor && (
                  <div><Text strong>Người xử lý:</Text> {selectedResponse.processor}</div>
                )}
                {selectedResponse.processTime && (
                  <div><Text strong>Thời gian xử lý:</Text> {new Date(selectedResponse.processTime).toLocaleString('vi-VN', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</div>
                )}
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <Text>Nếu đã lên điểm thành công chọn "Đã xử lý"</Text>
              </div>
              
              <Alert
                message="Thông tin người xử lý"
                description={`${user?.username || 'Unknown'} - ${new Date().toLocaleString('vi-VN', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}`}
                type="info"
                showIcon
              />
            </div>
          )}
        </Modal>
      </Card>
    </div>
  );
};

export default TelegramBillSender;
