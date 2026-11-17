import type { Dictionary } from '../types';

/**
 * Mọi lỗi người dùng có thể thấy, đánh khoá bằng `code` do API hoặc service ném ra.
 * Worker (`{ error, code }`) và `AppError` dùng chung bộ khoá này, nên câu hiển thị
 * được chọn ở client và dịch như phần còn lại của giao diện.
 */
export const errors: Dictionary['errors'] = {
  /** Lỗi không xác định — cũng là fallback khi server gửi mã lạ. */
  generic: 'Đã có lỗi xảy ra. Vui lòng thử lại.',

  // Đăng nhập và tài khoản
  signInRequired: 'Vui lòng đăng nhập để tiếp tục.',
  sessionExpired: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  signInNotConfigured: 'Bản dựng này chưa cấu hình đăng nhập.',
  invalidEmail: 'Địa chỉ email không hợp lệ.',
  missingPassword: 'Vui lòng nhập mật khẩu.',
  weakPassword: 'Mật khẩu cần ít nhất 6 ký tự.',
  emailInUse: 'Email này đã có tài khoản. Hãy đăng nhập thay vì tạo mới.',
  wrongCredentials: 'Email hoặc mật khẩu không đúng.',
  tooManyAttempts: 'Bạn đã thử quá nhiều lần. Hãy đợi một lát rồi thử lại.',
  popupClosed: 'Cửa sổ đăng nhập đã bị đóng trước khi hoàn tất.',
  popupBlocked: 'Trình duyệt chặn cửa sổ đăng nhập. Hãy cho phép popup rồi thử lại.',
  redirectIncomplete:
    'Đăng nhập Google quay về mà không có phiên — trình duyệt đã làm mất kết quả. Hãy thử lại, hoặc dùng email và mật khẩu.',
  networkError: 'Lỗi mạng — kiểm tra kết nối và thử lại.',
  unauthorizedDomain:
    'Địa chỉ này chưa được cấp phép đăng nhập Google. Hãy thêm vào Firebase → Authentication → Settings → Authorized domains.',
  providerDisabled:
    'Dự án chưa bật đăng nhập Google. Hãy bật Google provider trong Firebase Authentication.',
  invalidApiKey: 'Bản dựng này mang khóa Firebase không thuộc dự án.',
  accountExistsDifferent:
    'Email này đã có tài khoản bằng cách đăng nhập khác. Hãy dùng cách bạn đã đăng ký.',
  userDisabled: 'Tài khoản này đã bị vô hiệu hóa.',
  storageBlocked:
    'Trình duyệt chặn vùng lưu trữ mà đăng nhập Google cần. Hãy cho phép cookie cho trang này, hoặc dùng email và mật khẩu.',
  webviewSignIn:
    'Đăng nhập Google không chạy được trong trình duyệt tích hợp của ứng dụng. Hãy mở WordCrew bằng Chrome hoặc Safari, hoặc dùng email và mật khẩu.',
  notConfigured: 'Tính năng này chưa được cấu hình.',
  unauthorized: 'Bạn không có quyền thực hiện thao tác này.',

  // Thanh toán, đơn hàng và bản quyền
  unknownProduct: 'Sản phẩm này không còn khả dụng.',
  paymentsNotConfigured: 'Hệ thống thanh toán chưa được cấu hình.',
  tooManyOrders: 'Thiết bị này đã tạo quá nhiều đơn. Hãy thử lại sau.',
  orderNotFound: 'Không tìm thấy đơn hàng này.',
  unknownOrderCode: 'Mã đơn hàng không hợp lệ.',
  orderRevoked: 'Đơn hàng này đã bị thu hồi.',
  orderUpdateFailed: 'Không cập nhật được đơn hàng.',
  emailOwnsProduct: 'Email này đã sở hữu sản phẩm.',
  invalidLicenceKey: 'Đây không giống một mã bản quyền.',
  licenceNotFound: 'Không tìm thấy mã bản quyền. Hãy kiểm tra lại mã trong email mua hàng.',
  licenceExpired: 'Mã bản quyền đã hết hạn. Gia hạn ở tab Tài khoản để tiếp tục dùng bản đầy đủ.',
  notFound: 'Không tìm thấy.',

  // Lớp học
  classCodeLength: 'Hãy nhập mã lớp gồm 6 ký tự.',
  classCodeUnknown: 'Mã này không khớp với lớp nào.',
  classGone: 'Lớp này không còn tồn tại.',
  firestoreNotConfigured: 'Bản dựng này chưa cấu hình lớp học.',

  // Tên hiển thị
  nameSignIn: 'Hãy đăng nhập trước khi đổi tên.',
  nameTooShort: (min: string) => `Tên cần ít nhất ${min} ký tự.`,
  nameCooldown: (date: string) =>
    `Bạn có thể đổi tên lại vào ${date}. Liên hệ admin nếu cần sớm hơn.`,
};
