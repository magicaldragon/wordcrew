import type { Dictionary } from '../types';

/**
 * Khung bao quanh ván chơi: dải tiêu đề phía trên, nút thoát/toàn màn hình và các thông
 * báo cập nhật nổi trên mọi màn hình. Những gì không nằm trong màn chơi nhưng vẫn hiện
 * khi đang chơi thì đặt ở đây.
 */
export const shell: Dictionary['shell'] = {
  /** Tiêu đề tab trình duyệt — provider ngôn ngữ cập nhật để khớp với trang. */
  documentTitle: 'WordCrew — Chỉ dành cho cao thủ đoán từ',

  banner: {
    solo: 'Thử thách Solo',
    party: 'Chỉ dành cho cao thủ đoán từ',
  },

  header: {
    backHome: 'Về trang chủ',
    homeAria: 'WordCrew — về trang chủ',
    teacherRunning: (title: string) => `${title} — gõ từ tiếng Anh cho từng gợi ý.`,
    teacherIdle: 'Một level hoặc một bộ từ. Cuối buổi có báo cáo — không tim, không điểm số.',
    soloRunning: (emoji: string, name: string) =>
      `${emoji} ${name} — gõ hoặc nói đáp án trước khi hết giờ!`,
    soloIdle: 'Chơi solo, leo thang CEFR và lên đỉnh bảng xếp hạng.',
    party: 'Mô tả từ trên màn hình cho đồng đội đoán trước khi hết giờ!',
    exitSetup: 'Thoát thiết lập',
    exitSetupAria: 'Thoát thiết lập và về trang chủ',
  },

  fullscreen: {
    enter: 'Vào toàn màn hình',
    exit: 'Thoát toàn màn hình',
  },

  update: {
    majorName: (version: string) => `WordCrew ${version}`,
    majorTail: ' đã có bản mới.',
    ready: 'Đã có bản dựng mới.',
    reload: 'Tải lại',
    dismissMajorAria: 'Bỏ qua thông báo cập nhật',
    dismissMinorAria: 'Bỏ qua gợi ý cập nhật',
  },

  footer: {
    credit: 'Bởi Mr. C',
    heartAria: 'trái tim',
  },

  storageFull:
    'Bộ nhớ trình duyệt đã đầy nên âm thanh này không lưu được và sẽ mất khi tải lại. Hãy gỡ một âm thanh riêng (hoặc dùng "Đặt lại tất cả về âm thanh mặc định") rồi tải lên tệp nhỏ hơn.',
  signInForCheckout: 'Đăng nhập để tiếp tục thanh toán.',
};
