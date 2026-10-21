import type { Dictionary } from '../types';

/**
 * Vietnamese copy for the portal shell. Mirrors `en/dashboard.ts` key for key — the
 * `Dictionary` type makes a missing or mistyped entry a compile error.
 */
export const dashboard: Dictionary['dashboard'] = {
  brand: { product: 'WordCrew', portal: 'Cổng' },
  navAria: 'Các mục trong bảng điều khiển',

  nav: {
    games: 'Trò chơi',
    tools: 'Công cụ giảng dạy',
    class: 'Lớp của tôi',
    progress: 'Tiến độ của tôi',
    account: 'Tài khoản',
    admin: 'Quản trị',
    accounts: 'Quản lý tài khoản',
  },

  sections: {
    games: { title: 'Bộ trò chơi', subtitle: 'Chọn một trò chơi và bắt đầu ván mới.' },
    tools: {
      title: 'Công cụ giảng dạy',
      subtitle: 'Công cụ lớp học đi kèm trò chơi — không điểm số, không bảng xếp hạng.',
    },
    class: {
      title: 'Lớp của tôi',
      subtitle: 'Giao bài, nộp bài và xem cả lớp thực sự sai ở đâu.',
    },
    progress: { title: 'Tiến độ của tôi', subtitle: 'Số ván, điểm số và chuỗi ngày của bạn.' },
    account: { title: 'Tài khoản', subtitle: 'Trạng thái đăng nhập và thiết bị này.' },
    admin: {
      title: 'Quản trị',
      subtitle: 'Đơn hàng, doanh thu, cấp quyền và kỷ lục Solo.',
    },
    accounts: {
      title: 'Quản lý tài khoản',
      subtitle: 'Mọi tài khoản, FREE hay PRO, ai đang online và ai mở được công cụ.',
    },
  },

  games: {
    dailyAria: 'Thử thách hôm nay',
    dailyTitle: 'Thử thách hôm nay đang chờ bạn',
    dailyStreak: (days: number) =>
      `🔥 Chuỗi ${days} ngày — đừng để đứt. Mọi người cùng một bậc thang, khoảng 90 giây.`,
    dailyFresh: 'Mọi người cùng một bậc thang. Mỗi ngày một ván, khoảng 90 giây.',
    playToday: 'Chơi hôm nay',

    welcomeBack: (name: string) => `Chào mừng trở lại, ${name}.`,
    heroTitle: 'Trò chơi mà cả lớp cùng hò reo.',
    heroBody:
      'Một người mô tả từ, cả nhóm đoán trước khi hết giờ. Chuyền một màn hình quanh lớp — không cần tài khoản, không cần thêm thiết bị.',
    playFull: 'Chơi bản đầy đủ',
    playDemo: 'Chơi bản dùng thử',
    fullVersion: 'Bản đầy đủ',
    freeDemo: 'Bản dùng thử',
    unlockFull: 'Mở khóa bản đầy đủ',
    leaderboard: 'Bảng xếp hạng Solo',
    leaderboardAria: 'Mở bảng xếp hạng Solo',

    describe: 'Mô tả từ này',
    sampleClue: 'Nó cảnh báo tàu thuyền tránh xa những rạn đá lúc đêm.',
    sampleRound: 'Vòng 3/8',

    statsAria: 'Trong hộp có gì',
    stats: { words: 'Từ sẵn sàng', packs: 'Bộ CEFR', modes: 'Chế độ chơi' },
    chips: {
      levels: 'Trình độ Pre-A1 đến B2',
      words: (count: string) => `${count} từ`,
      passAndPlay: 'Chuyền tay nhau chơi',
      offline: 'Chơi được offline',
    },
    game: {
      tagline: 'Một người mô tả từ, cả nhóm đoán trước khi hết giờ.',
      meta: 'Chế độ Thường, Địa ngục, Đồng đội và Chơi đơn',
    },
    perks: [
      {
        title: 'Bộ từ Cambridge CEFR',
        body: 'Từ Starters đến B2 First. Chọn trình độ cho lớp là có ngay danh sách từ.',
      },
      {
        title: 'Vẫn chạy khi mất mạng',
        body: 'Cài một lần lên laptop của lớp; mất wifi vẫn dùng được.',
      },
      {
        title: 'Không cần thiết lập',
        body: 'Học sinh chỉ việc chạm màn hình. Không tài khoản, không lời mời, không cần thêm thiết bị.',
      },
    ],
    play: 'Chơi',
  },

  tools: {
    definition: {
      slot: 'Công cụ 1',
      name: 'Kiểm tra từ vựng',
      summary:
        'Kiểm tra một trình độ CEFR từ A1 đến B2, hoặc dán danh sách từ của tuần này. Nghĩa được điền sẵn để bạn xem lại, và học sinh nhận báo cáo thay vì điểm số.',
      meta: ['Trình độ A1–B2', 'Danh sách từ của bạn', 'Báo cáo từng học sinh'],
    },
    lockedPayment:
      'Công cụ này thuộc bản đầy đủ. Mở khóa một lần là dùng được mãi, kể cả khi offline trên thiết bị này.',
    lockedRole:
      'Công cụ này dành cho tài khoản giáo viên. Nhờ quản trị viên gán tài khoản của bạn thành giáo viên trong Quản lý tài khoản.',
    unlockFull: 'Mở khóa bản đầy đủ',
    footerFree: (date: string) => `Miễn phí cho mọi người đến ${date}.`,
    footerPaid: 'Đã bao gồm trong bản đầy đủ.',
    footerRole: 'Đã bao gồm với tài khoản giáo viên.',
    open: (slot: string) => `Mở ${slot}`,
    more: 'Sẽ còn thêm công cụ trên kệ này.',
  },

  class: {
    signIn:
      'Đăng nhập để vào lớp. Giáo viên có thể thêm địa chỉ email này hoặc đưa bạn mã lớp sáu ký tự — cách nào thì bài tập cũng hiện ở đây.',
    teacherConsole: 'Bảng điều khiển giáo viên',
    locked:
      'Mở lớp và giao bài thuộc bản đầy đủ. Học sinh của bạn luôn vào lớp miễn phí — bản quyền trả cho bảng điều khiển, không phải cho lớp học.',
    unlockFull: 'Mở khóa bản đầy đủ',
    footerFree: (date: string) =>
      `Miễn phí cho giáo viên đến ${date}. Sau đó học sinh vẫn miễn phí.`,
    footerPaid: 'Đã bao gồm trong bản đầy đủ. Học sinh của bạn vào miễn phí.',
  },

  progress: {
    signIn: 'Đăng nhập để đồng bộ số ván và điểm số giữa các thiết bị.',
    stats: {
      streak: 'Chuỗi ngày',
      rounds: 'Số ván đã chơi',
      best: 'Điểm cao nhất',
      guessed: 'Số từ đã đoán',
      bestStreak: 'Chuỗi dài nhất',
    },
    dailyTitle: '🌅 Thử thách hằng ngày',
    dailyBody: (freezes: number) =>
      `Mỗi ngày một bậc thang cố định — mọi người chơi cùng một bộ từ. Ngày bỏ lỡ được bù bằng một lượt băng, tối đa ${freezes} lượt mỗi tháng.`,
    playAgain: 'Chơi lại',
    playToday: 'Chơi hôm nay',
    dayStreak: 'Chuỗi ngày',
    bestStreak: 'Chuỗi dài nhất',
    freezesLeft: 'Lượt băng còn lại',
    badgeNext: (days: number, emoji: string, label: string) =>
      `Còn ${days} ngày nữa đến ${emoji} ${label}`,
    badgeAll: 'Đã mở mọi huy hiệu — huyền thoại.',
    badges: {
      Regular: 'Đều đặn',
      Committed: 'Quyết tâm',
      Unstoppable: 'Không ngừng',
      Legend: 'Huyền thoại',
      Icon: 'Biểu tượng',
    },
    last7: '7 ngày qua',
    noRuns: 'Chưa có ván nào trong 7 ngày qua. Hôm nay là một ngày đẹp để bắt đầu.',
    noRun: 'chưa chơi',
  },

  account: {
    signedIn: 'Đã đăng nhập',
    notSignedIn: 'Chưa đăng nhập',
    guest: 'Đang chơi với tư cách khách trên thiết bị này.',
    displayName: 'Tên hiển thị',
    displayNameBody:
      'Đây là tên hiện trên bảng xếp hạng Solo. Bạn có thể đổi 30 ngày một lần; liên hệ quản trị viên nếu cần sớm hơn.',
    yourName: 'Tên của bạn',
    saveName: 'Lưu tên',
    cooldown: (date: string) =>
      `Bạn có thể đổi tên lại vào ${date}. Liên hệ quản trị viên nếu cần sớm hơn.`,
    thisDevice: 'Thiết bị này',
    unlocked: 'Đã mở khóa bản đầy đủ.',
    demo: 'Đang dùng bản dùng thử miễn phí.',
    purchases: 'Các gói đã mua',
    purchasedOn: (date: string) => `Đã mua ${date}`,
    purchased: 'Đã mua',
    owned: 'Sở hữu',
    pending: 'Chuyển khoản đang chờ',
    refresh: 'Làm mới',
    pendingBody: 'Các giao dịch chưa khớp với đơn nào. Giữ mã bên dưới để được hỗ trợ.',
    expired: 'Đã hết hạn',
    awaiting: 'Đang chờ chuyển khoản',
    status: { paid: 'Đã trả', pending: 'Đang chờ', expired: 'Hết hạn' } as Record<string, string>,
    updated: 'Đã cập nhật tên hiển thị.',
    updateFailed: 'Không cập nhật được tên của bạn.',
  },

  admin: {
    revenue: 'Doanh thu',
    paidOrders: 'Đơn đã thanh toán',
    granted: 'Đã cấp',
    pending: 'Đang chờ',
    grant: 'Cấp quyền truy cập',
    grantBody:
      'Cấp bản quyền vĩnh viễn cho một email mà không cần thanh toán. Tài khoản sẽ nhận được ở lần đăng nhập tiếp theo trên bất kỳ thiết bị nào.',
    grantPlaceholder: 'student@example.com',
    working: 'Đang xử lý…',
    grantButton: 'Cấp',
    recentOrders: 'Đơn gần đây',
    refresh: 'Làm mới',
    noOrders: 'Chưa có đơn nào.',
    unknown: 'Tài khoản không xác định',
    revoke: 'Thu hồi',
    markPaid: 'Đánh dấu đã trả',
    grantDone: (email: string, key: string) => `Đã cấp cho ${email} · ${key}`,
    grantFailed: 'Không cấp được quyền truy cập.',
    revokeAsk: (key: string) => `Thu hồi ${key}? Bản quyền sẽ ngừng mở khóa ngay lập tức.`,
    revokeLabel: 'Thu hồi',
    revoked: (key: string) => `Đã thu hồi ${key}.`,
    revokeFailed: 'Không thu hồi được bản quyền đó.',
    reconcileAsk: (code: string) =>
      `Đánh dấu ${code} là đã thanh toán và phát hành bản quyền? Chỉ làm khi tiền đã về tài khoản.`,
    reconcileLabel: 'Đánh dấu đã trả',
    alreadyPaid: (code: string) => `${code} đã được thanh toán trước đó.`,
    reconcileDone: (code: string, key: string) => `Đã đánh dấu ${code} là đã trả · ${key}`,
    reconcileFailed: 'Không cập nhật được đơn đó.',
  },
};
