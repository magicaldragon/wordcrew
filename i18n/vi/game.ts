import type { Dictionary } from '../types';

/**
 * Luồng chơi WordCrew. Câu có nhấn mạnh nội dòng dùng dấu `**…**` và được các màn hình
 * render thành chữ đậm, nhờ vậy bản dịch luôn là một câu trọn vẹn.
 */
export const game: Dictionary['game'] = {
  audio: {
    music: 'Nhạc',
    effects: 'Hiệu ứng',
    musicVolumeAria: 'Âm lượng nhạc',
    effectsVolumeAria: 'Âm lượng hiệu ứng',
  },

  setup: {
    title: 'Thiết lập ván chơi',
    stepsAria: 'Các bước thiết lập',
    steps: {
      mode: 'Chế độ',
      words: 'Từ',
      settings: 'Cài đặt',
      track: 'Lộ trình',
    },

    errors: {
      noWordsForTypes: 'Không có từ nào trong bộ đã chọn khớp loại từ này. Thử loại từ hoặc bộ khác nhé.',
      tooFewWords: 'Cần ít nhất 3 từ để bắt đầu.',
      demoWordCap: (max: number) => `Bản demo giới hạn ${max} từ.`,
      timeRange: (min: number, max: number) => `Thời gian chơi phải từ ${min} đến ${max} phút.`,
      selectTypePreset: 'Bộ từ đã chọn cần ít nhất một loại từ.',
      selectType: 'Chọn ít nhất một loại từ.',
    },

    sets: {
      addWordsFirst: 'Hãy thêm từ trước nhé.',
      untitled: 'Bộ từ chưa đặt tên',
      savedNotice: (name: string, count: number) => `Đã lưu “${name}” (${count} từ).`,
      loadedNotice: (name: string, count: number) => `Đã tải “${name}” (${count} từ).`,
      deleteConfirm: (name: string) => `Xóa “${name}”?`,
      deleteConfirmLabel: 'Xóa',
      deletedNotice: (name: string) => `Đã xóa “${name}”.`,
    },

    settings: {
      soundLabel: 'Âm thanh',
      resetAllConfirm: 'Gỡ toàn bộ âm thanh riêng và quay về âm thanh mặc định?',
      resetAllConfirmLabel: 'Đặt lại',
    },

    sounds: {
      upload: 'Tải lên',
      clear: 'Gỡ',
      defaultSound: 'Âm thanh mặc định',
      defaultSounds: 'Âm thanh mặc định',
      uploadNamed: (label: string) => `Tải lên ${label}`,
      addNamed: (label: string) => `Thêm ${label}`,
      addCustom: (label: string) => `Thêm ${label} riêng`,
      remove: 'Gỡ',
      copied: (name: string) => `Đã sao chép ${name}.`,
      copyFailed: (name: string) => `Không sao chép được ${name}.`,
      copyBase64: 'Sao chép Base64',
      panelTitle: 'Âm thanh riêng',
      panelTitleHint: 'Tải lên âm thanh của bạn cho mọi khoảnh khắc trong ván chơi',
      lockedBody: 'Tải lên âm thanh của bạn cho mọi khoảnh khắc trong ván chơi.',
      unlock: 'Mở khóa',
      fullVersion: 'Bản đầy đủ',
      uploaded: (count: number) => `Đã tải ${count}`,
      optional: 'Không bắt buộc',
      intro: (formats: string, maxMb: number) =>
        `Tải âm thanh lên (${formats}, tối đa ${maxMb}MB mỗi file). Lưu trong trình duyệt này — nhấn Gỡ để trả về mặc định.`,
      powerUpsHeading: 'Âm thanh Power-Up:',
      resetAll: 'Đặt lại tất cả về âm thanh mặc định',
      resetAllTitle: 'Gỡ mọi âm thanh riêng và quay về mặc định',
      showDev: 'Hiện công cụ Dev',
      hideDev: 'Ẩn công cụ Dev',
      devHeading: 'Xuất dữ liệu âm thanh riêng',
      devHelp: 'Sao chép Base64 để nhúng vào `constants.ts`.',
      noneUploaded: 'Chưa có âm thanh riêng nào.',
      uploadFile: 'Tải tệp lên',
      errType: (formats: string) => `Định dạng tệp không được hỗ trợ. Hãy chọn tệp âm thanh: ${formats}.`,
      errCannotPlay: (type: string, formats: string) =>
        `Trình duyệt này không phát được âm thanh "${type}". Hãy chọn: ${formats}.`,
      errTooLarge: (maxMb: number) =>
        `Tệp vượt quá ${maxMb}MB. Hãy chọn đoạn ngắn hơn hoặc tệp có bitrate thấp hơn.`,
      errRead: 'Lỗi đọc tệp. Không thể xử lý dữ liệu tệp.',
      errReadRetry: 'Lỗi đọc tệp. Hãy thử lại hoặc chọn tệp khác.',
      slots: {
        setupMusic: 'Nhạc thiết lập',
        gameMusic: 'Nhạc trong ván',
        startGame: 'Bắt đầu ván',
        countdownGo: 'Đếm ngược "GO!"',
        correctGuess: 'Đoán đúng',
        skipWord: 'Bỏ qua từ',
        timesUp: 'Hết giờ',
        gameOverWin: 'Kết thúc (Thắng)',
        playAgain: 'Chơi lại',
        collected: 'Nhận Power-Up',
        timeFreeze: 'Đóng băng thời gian',
        skipFreebieUsed: 'Dùng lượt bỏ qua miễn phí',
        rushHourActivate: 'Kích hoạt Rush Hour',
        rushHourMusic: 'Nhạc Rush Hour',
      },
    },

    demo: {
      badge: 'DEMO',
      freeModes: 'Thường / Địa ngục / Đồng đội',
      words: (count: number) => `${count} từ`,
      minutes: (count: number) => `${count} phút`,
      unlock: 'Mở khóa',
      perks: {
        soloTracks: 'Mọi lộ trình Solo',
        upTo60Words: 'Tối đa 60 từ',
        upTo10Minutes: 'Tối đa 10 phút',
        customSounds: 'Âm thanh riêng',
      },
      packPerk: (name: string) => `Bộ ${name}`,
    },

    modeLabel: 'Chế độ chơi',
    modes: {
      normal: 'Thường',
      team: 'Đồng đội',
      hell: 'Địa ngục',
      solo: 'Chơi đơn',
    },

    solo: {
      rundownLabel: 'Luật chơi',
      rundown: (hearts: number, skips: number, seconds: number, floor: number) =>
        `${hearts} tim · ${skips} lượt bỏ qua miễn phí · ${seconds}s mỗi từ, giảm dần đến ${floor}s`,
      scoring: 'Mỗi từ đúng đều có điểm, kèm thưởng chuỗi và thêm tim trên đường đi.',
      playStyleLabel: 'Cách chơi:',
      playStyleHint: 'chọn kỹ năng bạn muốn luyện',
      blurbDescribe:
        'Nghe mô tả tiếng Anh rồi gõ hoặc nói từ. Bí quá? Mở gợi ý, rồi đến nghĩa tiếng Việt — nấc cuối này sẽ kết thúc chuỗi thắng của bạn.',
      blurbMeaning:
        'Chơi một mình với đồng hồ — chọn lộ trình ở bước sau, rồi gõ hoặc nói từng từ dựa trên nghĩa tiếng Việt.',
      styles: {
        describe: {
          name: 'Nghe & đoán',
          tagline: 'Mô tả tiếng Anh trước — chưa lộ tiếng Việt cho đến khi bạn mở gợi ý.',
          ladder: 'gợi ý → mách nước → nghĩa',
        },
        meaning: {
          name: 'Nghĩa & đánh vần',
          tagline: 'Hiện nghĩa tiếng Việt ngay từ đầu. Luyện đánh vần thuần túy.',
          ladder: 'nghĩa → đánh vần',
        },
      },
    },

    teamBlurb: 'Hai đội thay phiên đoán từ. Cày điểm và phá đối thủ!',
    hellBlurb:
      'Chế độ Địa ngục có luật riêng: bỏ qua bị trừ điểm và những đợt Rush Hour dồn dập. Xem hướng dẫn nhé!',

    packs: {
      label: 'Bộ từ',
      selected: (count: number) => `Đã chọn ${count}`,
      pickOneOrMore: 'chọn một hoặc nhiều',
      groupAria: 'Các bộ từ để gợi ý',
      lockedTitle: 'Mở khóa bản đầy đủ để chơi bộ này',
      toggleTitle: (level: string) => `Bật/tắt ${level}`,
      helpMerged:
        'Gợi ý được gộp từ mọi bộ bạn chọn — bạn sẽ tinh chỉnh danh sách ở bước sau.',
      helpEmpty:
        'Chọn một hoặc nhiều bộ để có danh sách sẵn dùng, hoặc để trống và tự nhập từ ở bước sau.',
    },

    tracks: {
      rookie: {
        name: 'Tân binh',
        tagline: 'Khởi động với từ thường ngày — Starters đến Movers.',
      },
      explorer: {
        name: 'Nhà thám hiểm',
        tagline: 'Từ thường ngày đến trình A2 — Starters đến Key.',
      },
      challenger: {
        name: 'Kẻ thách thức',
        tagline: 'Tiến vào vùng B1 — Starters đến PET.',
      },
      master: {
        name: 'Bậc thầy',
        tagline: 'Toàn bộ thang — Pre-A1 đến B2.',
      },
      daily: {
        name: 'Thử thách hôm nay',
        tagline: 'Mỗi ngày một thang từ cố định — mọi người chơi cùng bộ từ.',
      },
    },

    track: {
      done: 'Xong',
      replay: 'Chơi lại',
      play: 'Chơi',
      dailyLine: (tagline: string) => `${tagline} Đặt lại lúc nửa đêm.`,
      dueNotice: (count: number) => `📌 ${count} từ từ những lần trượt trước sẽ dẫn dắt ván tới.`,
      pileNotice: (count: number) =>
        `📌 ${count} từ trong danh sách ôn — chúng quay lại khi đến hạn.`,
      label: 'Lộ trình:',
      lockedTitle: 'Mở khóa bản đầy đủ để chơi lộ trình này',
      lockedBadge: 'Đầy đủ',
      bestTitle: 'Điểm cao nhất của bạn ở lộ trình này',
      footnote: (unlocked: boolean, signedIn: boolean) => {
        const access = unlocked
          ? 'Mọi lộ trình đã mở khóa.'
          : 'Tân binh miễn phí — mở khóa bản đầy đủ để chơi Nhà thám hiểm, Kẻ thách thức và Bậc thầy.';
        const board = signedIn
          ? 'Điểm cao nhất được lưu lên bảng xếp hạng.'
          : 'Đăng nhập để tham gia bảng xếp hạng chung.';
        return `${access} ${board}`;
      },
    },

    words: {
      tabsAria: 'Cách tạo danh sách từ',
      suggestion: 'Gợi ý',
      manual: 'Tự nhập danh sách',
      typesLabel: 'Loại từ:',
      types: {
        nouns: 'Danh từ',
        verbs: 'Động từ',
        adjectives: 'Tính từ',
        phrasalVerbs: 'Cụm động từ',
      },
      countLabel: 'Số từ:',
      countAria: 'Chọn số từ từ bộ có sẵn',
      countOption: (count: number) => `${count} từ`,
      shuffle: 'Xáo',
      shuffleTitle: 'Xáo một bộ từ mới từ pack này',
      clear: 'Xóa hết',
      clearTitle: 'Gỡ pack đã tải khỏi danh sách từ',
      selectType: 'Chọn một loại từ.',
      yourWords: 'Từ của bạn',
      counter: (count: number, min: number, demoMax: number | null) =>
        `(${count} từ, tối thiểu ${min}${demoMax ? `, demo tối đa ${demoMax}` : ''})`,
      placeholderSuggest: 'Từ trong pack sẽ hiện ở đây — bạn cứ sửa thoải mái...',
      placeholderManual: 'VD: Apple, Banana, Cherry',
      listAria: 'Danh sách từ cho ván chơi',
      helpSuggested: 'Gợi ý từ các pack bạn chọn. Sửa thoải mái, hoặc nhấn 🎲 Xáo để lấy bộ mới.',
      helpPickPack: 'Chọn một pack ở bước trước để có gợi ý, hoặc cứ tự nhập từ của bạn.',
      helpManual: 'Mỗi dòng một từ, hoặc cách nhau bằng dấu phẩy.',
      save: 'Lưu',
      saveTitle: 'Lưu các từ đang có thành một bộ',
      load: 'Tải',
      loadTitle: 'Tải một bộ đã lưu vào danh sách từ',
    },

    timePerWordLabel: 'Thời gian mỗi từ',
    secondsOption: (seconds: number) => `${seconds} giây`,
    gameTimeLabel: 'Thời gian chơi (giây)',
    gameTimeAria: 'Tổng thời gian chơi tính bằng giây',
    gameTimeSummary: (
      minutes: number,
      seconds: number,
      minMinutes: number,
      maxMinutes: number,
      locked: boolean,
    ) => `Tổng ${minutes} phút ${seconds} giây · ${minMinutes}–${maxMinutes} phút${locked ? ' ở bản demo' : ''}`,

    footer: {
      back: 'Quay lại',
      startSolo: 'Chơi đơn!',
      startGame: 'Bắt đầu!',
      next: (step: string) => `Tiếp: ${step}`,
      startSoloAria: 'Nút bắt đầu lượt chơi đơn',
      startGameAria: 'Nút bắt đầu ván chơi',
      goToStepAria: (step: string) => `Đến bước ${step}`,
      needWords: 'Thêm ít nhất 3 từ để tiếp tục',
    },

    saveDialog: {
      title: 'Lưu bộ từ',
      body: 'Đặt tên để tạo bộ mới, hoặc chọn một bộ bên dưới để đổi tên và cập nhật.',
      nameLabel: 'Tên bộ',
      namePlaceholder: 'VD: Animals — Unit 3',
      editing: 'Đang sửa một bộ có sẵn — lưu sẽ ghi đè bộ đó.',
      existing: 'Bộ đã lưu',
      wordsCount: (count: number) => `${count} từ`,
      cancel: 'Hủy',
      update: 'Cập nhật bộ',
      saveNew: 'Lưu bộ mới',
    },

    loadDialog: {
      title: 'Tải bộ từ',
      empty: 'Chưa có bộ nào — hãy lưu danh sách từ trước.',
      close: 'Đóng',
      deleteAria: (name: string) => `Xóa bộ đã lưu ${name}`,
    },
  },

  play: {
    revealHint: 'Giữ SPACE hoặc thẻ để xem từ',
    rushHour: '💎 RUSH HOUR !',
    comboActive: (streak: number) => `CHUỖI ${streak}x BẬT!`,
    timeBonus: (seconds: number) => `+${seconds} GIÂY!`,
    timeFreeze: (seconds: number) => `❄️ ĐÓNG BĂNG THỜI GIAN! +${seconds}s`,
    skipFreebieEarned: '↪️ ĐƯỢC LƯỢT BỎ QUA MIỄN PHÍ!',
    skipFreebieUsed: '↪️ ĐÃ DÙNG LƯỢT BỎ QUA MIỄN PHÍ!',
    rushHourOver: 'RUSH HOUR KẾT THÚC!',

    pauseAria: 'Tạm dừng ván chơi',
    pauseTitle: 'Tạm dừng (Esc)',
    pausedAria: 'Ván chơi đang tạm dừng',
    paused: 'Tạm dừng',
    resume: '▶️ Tiếp tục',
    endGameSeeScore: '⏹️ Kết thúc & xem điểm',
    escToResume: 'Nhấn Esc để tiếp tục',

    endConfirmAria: 'Xác nhận kết thúc ván',
    endConfirmTitle: 'Kết thúc ván ngay?',
    endConfirmTeam: 'Điểm hiện tại của hai đội sẽ được đưa sang màn kết quả.',
    endConfirmSingle: 'Điểm hiện tại của bạn sẽ được đưa sang màn kết quả.',
    cancel: 'Hủy',
    endGame: 'Kết thúc',

    teamA: 'Đội A',
    teamB: 'Đội B',
    teamMilestone: (team: string) => `Đội ${team} chạm mốc!`,
    chooseBox: 'Chọn một hộp bí ẩn!',
    youGot: 'Bạn nhận được:',
    teamTurn: (team: string) => `Lượt Đội ${team}!`,

    boxEffects: {
      add50: '+50 điểm!',
      add100: '+100 điểm!',
      add200: '+200 điểm!',
      sub50: '-50 điểm!',
      permaBonus: '+10 điểm mỗi từ đúng!',
      swapScores: 'Hoán đổi điểm!',
      steal: 'Cướp 20% điểm của đối thủ!',
      opponentSkip: '+30 điểm khi đối thủ bỏ qua!',
      perishTogether: 'CÙNG CHẾT CHUNG!',
    },

    wordOf: (current: number, total: number) => `Từ ${current}/${total}`,
    calculating: 'Đang tính điểm...',
    correct: 'ĐÚNG',
    skip: 'BỎ QUA',
    endGameButton: 'Kết thúc & xem điểm',
    demo: 'Demo',
    points: 'ĐIỂM:',
    timeLabel: 'Thời gian',
    timeLabelLong: 'THỜI GIAN:',
    timeRemainingAria: 'Thời gian còn lại',
    timerFrozenAria: 'Đồng hồ đóng băng',
    frozen: 'ĐÓNG BĂNG',
    skipFreebiesTitle: (count: number) => `Lượt bỏ qua miễn phí: ${count}`,
    combo: (streak: number) => `🔥 Chuỗi: x${streak}`,
    usedSkipHeart: 'Tim bỏ qua đã dùng',
    availableSkipHeart: 'Tim bỏ qua còn lại',
    lucky: (multiplier: number) => `May mắn x${multiplier}!`,
    happyEmojiAria: 'Biểu tượng cổ vũ',
    sadEmojiAria: 'Biểu tượng buồn',
    correctAria: 'Đoán đúng (phím trái)',
    passAria: 'Bỏ qua từ (phím phải)',
    endGameAria: 'Kết thúc ván và xem điểm',
  },

  results: {
    gameOver: 'Kết thúc!',
    resultEmojiAria: 'biểu tượng kết quả',
    yourScore: 'Điểm của bạn:',
    timeBonus: (seconds: number) => `Thưởng thời gian: +${seconds}`,
    draw: 'Hòa nhau! 🤝',
    win: (team: string, emoji: string) => `${team} thắng! ${emoji}`,
    teamA: 'Đội A',
    teamB: 'Đội B',
    homeAria: 'Về trang chủ',
    home: 'Trang chủ',

    demoRounds: (rounds: number) => `🔥 Đã ${rounds} ván — chơi tiếp chứ?`,
    demoOnly: '🔥 Đó mới chỉ là bản demo',
    demoPitchRounds: 'Địa ngục 💀 và 4 bộ từ nữa chỉ cách bạn một mã kích hoạt.',
    demoPitchUnlock: 'Mở khóa **Địa ngục 💀** và **4 bộ từ nữa**.',
    unlockCta: 'Mở khóa bản đầy đủ',

    compliments: {
      tier0: {
        emoji: '😔',
        messages: [
          'Chưa đoán đúng từ nào. Lần sau may mắn hơn nhé!',
          'Khởi đầu mới đang chờ! Thử lại nhé?',
          'Chuyên gia nào cũng từng là người mới. Cố lên!',
          '0 điểm ư? Chỉ có thể đi lên thôi!',
          'Đừng lo, tờ giấy trắng cũng có thể thành kiệt tác!',
        ],
      },
      tier1: {
        emoji: '👍',
        messages: [
          'Khởi đầu tốt! Luyện tiếp nhé!',
          'Bạn mới chỉ đang khởi động thôi!',
          'Mở màn đầy hứa hẹn! Thêm ván nữa?',
          'Những bước đầu thật đẹp!',
          'Cố lên, bạn đang tạo đà rồi!',
        ],
      },
      tier2: {
        emoji: '😊',
        messages: [
          'Làm tốt lắm! Bạn đang tiến bộ đấy.',
          'Nỗ lực ổn đấy! Bạn đang khá lên!',
          'Ván đó khá tốt. Giữ phong độ nhé!',
          'Bạn đang đi đúng hướng!',
          'Bắt nhịp được rồi đấy!',
        ],
      },
      tier3: {
        emoji: '🎉',
        messages: [
          'Điểm cao đấy! Bạn đoán quá giỏi!',
          'Ấn tượng thật! Bạn có tay nghề rồi!',
          'Wow, hơn 1000 điểm! Tuyệt vời!',
          'Màn trình diễn vững vàng!',
          'Bạn làm việc này trông dễ quá!',
        ],
      },
      tier4: {
        emoji: '🚀',
        messages: [
          'Xuất sắc! Bạn có kỹ năng thật sự!',
          'Hơn 2000! Bạn đang bay!',
          'Đoán đỉnh thật sự!',
          'Tuyệt vời! Giữ năng lượng này nhé!',
          'Bạn sinh ra để chơi trò này!',
        ],
      },
      tier5: {
        emoji: '🔥',
        messages: [
          'Quá đỉnh! Bạn đang bốc cháy!',
          'Điểm phi thường! Áp đảo hoàn toàn!',
          'Bạn lao qua từng từ như tên lửa!',
          'Đáng nể! Một màn thượng thừa!',
          'Ở đây nóng thật, hay tại điểm của bạn?',
        ],
      },
      tier6: {
        emoji: '🏆✨',
        messages: [
          'Không thể tin nổi! Bạn là nhà vô địch WordCrew!',
          'Suýt mở khóa huyền thoại rồi!',
          'Màn trình diễn bậc thầy! Đỉnh của đỉnh!',
          'Điểm số nghẹt thở! Chơi hay lắm!',
          'Bạn ở một đẳng cấp riêng!',
        ],
      },
      tier7: {
        emoji: '🌟👑',
        messages: [
          'WordCrew GOD! Không ai sánh bằng!',
          'KHÔNG THỂ TIN NỔI! Bạn đã chinh phục trò chơi!',
          'Hoàn hảo! Điểm số đi vào lịch sử!',
          'Có từ nào bạn không đoán được không? Huyền thoại thật sự!',
          'Bạn không chỉ chơi, bạn THỐNG TRỊ!',
        ],
      },
    },
  },

  instructions: {
    pager: {
      sectionsAria: 'Các mục hướng dẫn',
      previous: 'Mục trước',
      next: 'Mục sau',
    },
    tabs: {
      gameplay: 'Cách chơi',
      scoring: 'Tính điểm',
      penalties: 'Hình phạt',
    },
    footer: {
      backAria: 'Quay lại thiết lập ván',
      backToSetup: 'Quay lại thiết lập',
      startAria: 'Bắt đầu chơi',
      enterHell: 'Vào Địa ngục!',
      startBattle: 'Giao chiến!',
      letsPlay: 'Chơi thôi!',
    },

    normal: {
      title: '🚀 NORMAL MODE: NHIỆM VỤ CỦA BẠN 🚀',
      goalTitle: '🎯 Mục tiêu',
      goalBody:
        'Một người mô tả từ trên màn hình — không dùng điệu bộ, không đánh vần, không gợi ý kiểu “nghe giống…”. Cả đội đoán càng nhiều càng tốt trước khi hết giờ!',
      howTitle: '🎮 Cách chơi',
      correctLabel: '✔️ ĐÚNG:',
      correctBody: 'Đoán trúng rồi — nhấn CORRECT hoặc bấm **⬅️ phím trái**.',
      skipLabel: '✖️ BỎ QUA:',
      skipBody: 'Bí một từ? Nhấn SKIP hoặc bấm **➡️ phím phải**.',
      timerLabel: '⏰ ĐỒNG HỒ:',
      timerBody: 'Để ý đồng hồ — về 0 là hết ván.',
      peekTitle: '🙈 Thẻ từ chống nhìn lén',
      peekBody:
        'Mỗi từ hiện trong **4 giây** rồi tự ẩn. Giữ **SPACE** (hoặc nhấn giữ thẻ) để hiện lại — thả ra là ẩn.',
      scoringTitle: '💰 Điểm & thưởng',
      standardLabel: 'Đoán thường:',
      standardBody: '+100 điểm.',
      luckyLabel: '🌟 Từ may mắn:',
      luckyBody: 'Vài từ đặc biệt cho **hệ số điểm x3!**',
      comboLabel: '🔥 Chuỗi combo:',
      comboBody: 'Từ 3 từ đúng liên tiếp trở lên được **+50 mỗi từ**; chuỗi 5 cộng thêm **+5 giây**!',
      timeBonusLabel: '⏱️ Thưởng thời gian:',
      timeBonusBody: 'Thời gian còn lại trên đồng hồ được cộng vào điểm cuối!',
      powerUpsTitle: '✨ Power-Up',
      freezeLabel: '❄️ Đóng băng thời gian:',
      freezeBody: 'Chuỗi **10 từ đúng** cộng **+5 giây** và đóng băng đồng hồ!',
      skipFreebieLabel: '↪️ Lượt bỏ qua miễn phí:',
      skipFreebieBody: 'Chạm **mốc chuỗi (5, 15...)** để nhận lượt bỏ qua không mất combo.',
      rushHourLabel: '💎 RUSH HOUR:',
      rushHourBody:
        'Đạt **mốc điểm (2000, 4000...)** để có 30 giây tốc độ x2 — đoán đúng được **ĐIỂM GẤP ĐÔI!**',
    },

    hell: {
      title: '🔥 HELL MODE: BẠN TRỤ NỔI KHÔNG? 🔥',
      challengeTitle: '👹 Thử thách',
      challengeBody:
        'Đây là bài kiểm tra kỹ năng tối thượng với danh sách từ bạn chọn. Ghi điểm càng cao càng tốt trước khi **THANH THỜI GIAN** trên đỉnh cạn hết. Không có thưởng thời gian — chỉ có sống sót!',
      peekTitle: '🙈 Thẻ từ chống nhìn lén',
      peekBody:
        'Từ tự ẩn sau **4 giây**. Giữ **SPACE** (hoặc nhấn giữ thẻ) để hiện lại — thả ra là ẩn.',
      clockTitle: '⏳ Đồng hồ là kẻ thù',
      rushHourLabel: '💎 RUSH HOUR:',
      rushHourBody: 'Kích hoạt **hai lần mỗi ván** theo thời gian.',
      rushHourFastBody:
        'Trong Rush Hour, thanh thời gian cạn **NHANH GẤP ĐÔI**, nhưng đoán đúng được **ĐIỂM GẤP ĐÔI!**',
      skipsTitle: '💔 Bỏ qua là phải trả giá',
      skipStartBody:
        'Bạn chỉ có **3 LƯỢT BỎ QUA**, hiển thị bằng ❤️. Hết lượt là nút bỏ qua bị khóa.',
      skipPenaltyLabel: 'Phạt bỏ qua thường:',
      skipPenaltyBody: '**-200 điểm.**',
      luckySkipLabel: '🌟 Phạt bỏ qua từ may mắn:',
      luckySkipBody: '**-500 điểm!**',
      floorLabel: 'Sàn điểm:',
      floorBody: 'hình phạt không bao giờ đẩy điểm xuống dưới **0**.',
      freebieLabel: '↪️ Lượt bỏ qua miễn phí',
      freebieBody: '(kiếm từ chuỗi) **KHÔNG** tốn ❤️ hay trừ điểm.',
      goodLuck: 'Chúc may mắn... bạn sẽ cần đấy. 😈',
    },

    team: {
      title: '🤝 TEAM MODE: LUẬT CHƠI 🤝',
      goalTitle: '🎯 Mục tiêu',
      goalBody:
        'Hai đội thay phiên đoán từ. Sau khi một đội trả lời, lượt **chuyển ngay sang đội kia**. Chơi đến khi **dùng hết mọi từ trong danh sách** — đội điểm cao hơn thắng!',
      peekTitle: '🙈 Thẻ từ chống nhìn lén',
      peekBody:
        'Từ đang chơi tự ẩn sau **4 giây**. Giữ **SPACE** (hoặc nhấn giữ thẻ) để hiện lại — thả ra là ẩn, để người đoán không ăn gian qua phản chiếu màn hình.',
      boxesTitle: '🎁 Hộp bí ẩn!',
      boxesBody:
        'Khi điểm đội bạn chạm **mốc (500, 1000, 1500...)**, ván tạm dừng và bạn chọn một trong ba hộp bí ẩn. Chúng có thể chứa buff mạnh hoặc debuff phá bĩnh làm đổi cả cục diện!',
      scoringTitle: '💰 Tính điểm',
      correctLabel: 'Đoán đúng:',
      correctBody: '+100 điểm.',
      skipLabel: 'Bỏ qua từ:',
      skipBody: '-30 điểm (không xuống dưới 0).',
      speedLabel: '⚡ Thưởng tốc độ:',
      speedFast: 'Đoán dưới 5 giây được **+50 điểm!**',
      speedMid: 'Đoán trong 5-10 giây được **+20 điểm.**',
      note: 'Lưu ý: chế độ này không có thưởng combo hay từ may mắn!',
    },
  },
};
