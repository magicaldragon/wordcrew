import type { Dictionary } from '../types';

/**
 * Vietnamese copy for the landing, sign-in and purchase screens. Mirrors `en/auth.ts`
 * key for key — the `Dictionary` type makes a missing or mistyped entry a compile error.
 */
export const auth: Dictionary['auth'] = {
  unlockFull: 'Mở khóa bản đầy đủ',

  landing: {
    back: 'Bảng điều khiển',
    eyebrow: 'Chỉ dành cho cao thủ đoán từ',
    heroBodyBefore:
      'Một người mô tả từ, cả nhóm cùng đoán. Trò chơi từ ngữ lớp học nhanh và náo nhiệt dành cho',
    heroPlayers: '2 người chơi trở lên',
    heroBodyAfter: 'trên cùng một màn hình.',
    playFull: 'Chơi bản đầy đủ',
    playDemo: 'Chơi bản dùng thử',
    freeBadges: 'Miễn phí · Không cần đăng ký · Chơi offline',
    unlockedNote: 'Đã mở khóa bản đầy đủ trên thiết bị này',
    alreadyBought: 'Đã mua rồi? Nhập mã bản quyền',
    modesTitle: 'Bốn cách chơi',
    modesSubtitle: 'Chạm vào chế độ để chơi ngay',
    fullBadge: 'Bản đầy đủ',
    playModeAria: (mode: string) => `Chơi chế độ ${mode}`,
    unlockModeAria: (mode: string) => `Mở khóa chế độ ${mode} (Bản đầy đủ)`,
    modes: {
      normal: {
        title: 'Thường',
        players: '2+ người chơi',
        tagline:
          'Lối chơi kinh điển. Từ may mắn, chuỗi combo và thưởng thời gian — hợp với mọi lớp học.',
      },
      hell: {
        title: 'Địa ngục',
        players: '2+ người chơi',
        tagline: 'Chỉ được bỏ qua 3 lần, hình phạt nặng và Rush Hour nhân đôi. Sống sót — hoặc đừng.',
      },
      team: {
        title: 'Đồng đội',
        players: '4+ người chơi',
        tagline: 'Hai đội luân phiên thi đấu. Thưởng tốc độ và hộp bất ngờ — phá đối thủ.',
      },
      solo: {
        title: 'Chơi đơn',
        players: '1 người chơi',
        tagline:
          'Chơi một mình. Đoán từng từ qua các ô chữ cái và gợi ý tiếng Việt — chơi đến khi hết tim.',
      },
    },
    madeBy: (name: string) => `Tạo bởi ${name}`,
    heartAria: 'trái tim',
  },

  signIn: {
    title: 'Đăng nhập WordCrew',
    signUpTitle: 'Tạo tài khoản của bạn',
    firebaseNoticeBefore: 'Bản dựng này chưa cấu hình Firebase nên không thể đăng nhập. Hãy thêm khóa',
    firebaseNoticeKeysTo: 'vào tệp',
    firebaseNoticeAfter: '.',
    openingGoogle: 'Đang mở Google…',
    continueWithGoogle: 'Tiếp tục với Google',
    emailDivider: 'hoặc dùng email',
    name: 'Tên',
    namePlaceholder: 'Cô Lan',
    email: 'Email',
    password: 'Mật khẩu',
    error: 'Không thể đăng nhập.',
    pleaseWait: 'Vui lòng chờ…',
    createAccount: 'Tạo tài khoản',
    newHere: 'Lần đầu đến với WordCrew?',
    haveAccount: 'Đã có tài khoản?',
    createAccountLink: 'Tạo tài khoản',
  },

  account: {
    defaultLabel: 'Tài khoản',
    signedInLabel: 'Đã đăng nhập',
  },

  purchase: {
    oneTime: 'thanh toán một lần · dùng mãi mãi',
    continueToPayment: 'Tiếp tục thanh toán',
    signInAndContinue: 'Đăng nhập và tiếp tục',
    bankTransferNote: 'Chuyển khoản ngân hàng — mã QR sẽ hiện ở bước tiếp theo.',
    preparingQr: 'Đang tạo mã QR của bạn…',
    sessionExpired: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.',
    orderFailed: 'Không thể tạo đơn hàng.',
    qrExpired: 'Mã QR này đã hết hạn. Hãy tạo mã mới để tiếp tục.',
    qrAlt: (code: string) => `Mã VietQR cho đơn ${code}`,
    scanHint: 'Quét bằng ứng dụng ngân hàng bất kỳ, hoặc chuyển khoản thủ công đến',
    transferMemo: 'Nội dung chuyển khoản — giữ nguyên chính xác như hiển thị',
    copyKey: 'Sao chép khóa',
    licenceAuto: 'Bản quyền được cấp tự động ngay khi nhận được khoản chuyển khoản.',
    waiting: '⏳ Đang chờ chuyển khoản…',
    paymentReceived: 'Đã nhận thanh toán — đây là mã bản quyền của bạn.',
    unlockDevice: 'Mở khóa thiết bị này',
    keepKey: 'Hãy giữ mã này — mã cũng mở khóa trò chơi trên các thiết bị khác của bạn.',
  },

  unlock: {
    licenceLabel: 'Mã bản quyền hoặc mã truy cập giáo viên',
    submit: 'Mở khóa',
    failure: 'Mã không hợp lệ. Vui lòng kiểm tra và thử lại.',
    later: 'Để sau',
  },

  perks: [
    '💀 Chế độ Địa ngục — bỏ qua khắc nghiệt & Rush Hour gấp đôi',
    '📚 Thêm 4 bộ từ vựng (A2 · A2 Key · B1 · B2)',
    '⏱️ Tối đa 60 từ & 10 phút mỗi ván',
    '🎵 Âm thanh tùy chỉnh — tải lên nhạc & hiệu ứng của bạn',
  ],
};
