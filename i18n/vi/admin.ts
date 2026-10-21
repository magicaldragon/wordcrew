import type { Dictionary } from '../types';

/**
 * Vietnamese copy for the admin console. Mirrors `en/admin.ts` key for key — the
 * `Dictionary` type makes a missing or mistyped entry a compile error.
 */
export const admin: Dictionary['admin'] = {
  stats: {
    accounts: 'Tài khoản',
    pro: 'PRO',
    free: 'FREE',
    onlineNow: 'Đang online',
  },

  badges: {
    pro: 'PRO',
    free: 'FREE',
    admin: 'QUẢN TRỊ',
    teacher: 'GIÁO VIÊN',
    student: 'HỌC SINH',
  },

  relative: {
    never: 'Chưa từng',
    justNow: 'Vừa xong',
    minutesAgo: (count: number) => `${count} phút trước`,
    hoursAgo: (count: number) => `${count} giờ trước`,
    daysAgo: (count: number) => `${count} ngày trước`,
  },

  directory: {
    title: 'Tài khoản',
    subtitle:
      'Tài khoản FREE tự động nâng lên PRO khi đơn đã thanh toán khớp với tài khoản (uid hoặc email đã xác minh).',
    refresh: 'Cập nhật PRO',
    refreshing: 'Đang cập nhật…',
    filterAria: 'Lọc tài khoản',
    filters: {
      all: 'Tất cả tài khoản',
      free: 'Miễn phí',
      pro: 'PRO',
    },
    searchLabel: 'Tìm tài khoản',
    searchPlaceholder: 'Tìm theo tên hoặc email…',
    loadFailed:
      'Không đọc được danh bạ tài khoản. Kiểm tra email quản trị trong firestore.rules có khớp với ADMIN_EMAILS không.',
    loading: 'Đang tải tài khoản…',
    empty: 'Không có tài khoản nào khớp với bộ lọc này.',

    nameLength: (min: number, max: number) => `Tên cần từ ${min}–${max} ký tự.`,
    renamed: (account: string, name: string) => `Đã đổi tên ${account} thành ${name}.`,
    renameFailed: 'Không đổi được tên tài khoản. Có thể quy tắc quản trị chưa được triển khai.',
    promoted: (account: string) => `${account} đã có thể mở công cụ.`,
    demoted: (account: string) => `${account} đã trở lại là học sinh.`,
    roleFailed: 'Không đổi được vai trò. Kiểm tra email quản trị trong quy tắc Firestore.',

    displayNameAria: (account: string) => `Tên hiển thị của ${account}`,
    renameAria: (account: string) => `Đổi tên ${account}`,
    renameTitle: 'Đổi tên tài khoản này',
    noDisplayName: '(chưa có tên hiển thị)',
    noEmail: 'Chưa có email',
    online: 'Online',
    lastSeen: (value: string) => `Truy cập cuối: ${value}`,
    lastLogin: (value: string) => `Đăng nhập cuối: ${value}`,
    joined: (value: string) => `Tham gia: ${value}`,
    unknown: 'Không rõ',
    proSince: (value: string) => `PRO từ: ${value}`,
    makeTeacher: 'Chuyển thành giáo viên',
    makeStudent: 'Chuyển thành học sinh',
    grantToolsTitle: 'Cấp quyền dùng công cụ giáo viên',
    revokeToolsTitle: 'Thu quyền dùng công cụ giáo viên',
  },

  monthly: {
    title: 'Bảng thành tích hằng tháng',
    subtitle:
      'Mỗi tháng đã kết thúc đều được lưu lại. Thử thách hôm nay giữ một bảng riêng cho mỗi ngày.',
    monthAria: 'Chọn tháng',
    boardsAria: 'Chọn bảng',

    dailyBoard: (period: string | null, players: number | null) => {
      const parts = ['Bảng hằng ngày'];
      if (period) parts.push(period);
      if (players !== null) parts.push(`${players} người chơi`);
      return parts.join(' · ');
    },
    monthlyBoard: (period: string | null, players: number | null) => {
      const parts = ['Bảng hằng tháng'];
      if (period) parts.push(period);
      if (players !== null) parts.push(`${players} người chơi`);
      return parts.join(' · ');
    },

    loading: 'Đang tải bảng thành tích…',
    empty: 'Bảng này chưa có điểm nào.',
    words: (count: number) => `${count} từ`,
  },
};
