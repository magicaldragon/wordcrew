// vietnameseMeanings.ts
//
// Vietnamese glosses for the CEFR word packs, used as an in-game hint.
// The hint stays hidden by default and only surfaces once a describer has been
// stuck on the same word for a while (see GameScreen STRUGGLE_HINT_AFTER_MS), so
// it never gives the answer away during the opening reveal.
//
// Keys are lower-cased and must match the entries in cefrWordLists.ts exactly.

// Machine-generated glosses for the packs that carry no hand-curated entry, so the
// hint still resolves offline. Curated entries below always win.
import { GENERATED_VIETNAMESE_MEANINGS } from './vietnameseGlosses.generated';

export const VIETNAMESE_MEANINGS: Record<string, string> = {
  // ── STARTERS (Pre-A1) · nouns ─────────────────────────────────────────────
  "afternoon": "buổi chiều", "alien": "người ngoài hành tinh", "alphabet": "bảng chữ cái", "animal": "động vật", "answer": "câu trả lời",
  "apartment": "căn hộ", "apple": "quả táo", "arm": "cánh tay", "armchair": "ghế bành", "baby": "em bé",
  "badminton": "cầu lông", "bag": "cái túi", "ball": "quả bóng", "balloon": "bóng bay", "banana": "quả chuối",
  "baseball": "bóng chày", "baseball cap": "mũ lưỡi trai", "basketball": "bóng rổ", "bath": "bồn tắm", "bathroom": "phòng tắm",
  "beach": "bãi biển", "bean": "hạt đậu", "bear": "con gấu", "bed": "cái giường", "bedroom": "phòng ngủ",
  "bee": "con ong", "bike": "xe đạp", "bird": "con chim", "birthday": "sinh nhật", "board": "cái bảng",
  "board game": "trò chơi cờ bàn", "boat": "cái thuyền", "body": "cơ thể", "book": "quyển sách", "bookcase": "tủ sách",
  "bookshop": "hiệu sách", "boots": "đôi ủng", "box": "cái hộp", "boy": "bé trai", "bread": "bánh mì",
  "breakfast": "bữa sáng", "brother": "anh/em trai", "burger": "bánh burger", "bus": "xe buýt", "cake": "bánh ngọt",
  "camera": "máy ảnh", "car": "ô tô", "carrot": "củ cà rốt", "cat": "con mèo", "chair": "cái ghế",
  "chicken": "con gà", "child": "đứa trẻ", "chips": "khoai tây chiên", "chocolate": "sô-cô-la", "class": "lớp học",
  "classmate": "bạn cùng lớp", "classroom": "phòng học", "clock": "đồng hồ", "clothes": "quần áo", "coconut": "quả dừa",
  "colour": "màu sắc", "computer": "máy tính", "cousin": "anh chị em họ", "cow": "con bò", "crayon": "bút sáp màu",
  "crocodile": "con cá sấu", "cross": "cây thánh giá", "cupboard": "cái tủ", "dad": "bố", "day": "ngày",
  "desk": "bàn học", "dining room": "phòng ăn", "dinner": "bữa tối", "dog": "con chó", "doll": "búp bê",
  "donkey": "con lừa", "door": "cửa", "drawing": "bức vẽ", "dress": "váy liền", "drink": "đồ uống",
  "duck": "con vịt", "ear": "tai", "egg": "quả trứng", "elephant": "con voi", "end": "kết thúc",
  "eraser": "cục tẩy", "evening": "buổi tối", "example": "ví dụ", "eye": "mắt", "face": "khuôn mặt",
  "family": "gia đình", "father": "bố", "fish": "con cá", "fishing": "câu cá", "flat": "căn hộ",
  "floor": "sàn nhà", "flower": "bông hoa", "food": "thức ăn", "foot": "bàn chân", "football": "bóng đá",
  "friend": "bạn bè", "fries": "khoai tây chiên", "frog": "con ếch", "fruit": "trái cây", "fun": "niềm vui",
  "game": "trò chơi", "garden": "khu vườn", "giraffe": "hươu cao cổ", "girl": "bé gái", "glasses": "kính mắt",
  "goat": "con dê", "grandfather": "ông", "grandma": "bà", "grandmother": "bà", "grandpa": "ông",
  "grape": "quả nho", "guitar": "đàn ghi-ta", "hair": "tóc", "hall": "hành lang", "hand": "bàn tay",
  "handbag": "túi xách", "hat": "cái mũ", "head": "cái đầu", "helicopter": "trực thăng", "hippo": "hà mã",
  "hobby": "sở thích", "hockey": "khúc côn cầu", "home": "nhà", "horse": "con ngựa", "house": "ngôi nhà",
  "ice cream": "kem", "jacket": "áo khoác", "jeans": "quần jeans", "jellyfish": "con sứa", "juice": "nước ép",
  "keyboard": "bàn phím", "kid": "đứa trẻ", "kitchen": "nhà bếp", "kite": "con diều", "kiwi": "quả kiwi",
  "lamp": "đèn", "leg": "cái chân", "lemon": "quả chanh", "lemonade": "nước chanh", "lesson": "bài học",
  "letter": "lá thư", "lime": "quả chanh xanh", "line": "đường kẻ", "living room": "phòng khách", "lizard": "con thằn lằn",
  "lorry": "xe tải", "lunch": "bữa trưa", "man": "người đàn ông", "mango": "quả xoài", "mat": "tấm thảm",
  "meat": "thịt", "meatballs": "thịt viên", "milk": "sữa", "mirror": "gương", "monkey": "con khỉ",
  "monster": "con quái vật", "morning": "buổi sáng", "mother": "mẹ", "motorbike": "xe máy", "mouse": "con chuột",
  "mouth": "miệng", "mum": "mẹ", "music": "âm nhạc", "name": "tên", "night": "ban đêm",
  "nose": "mũi", "number": "con số", "onion": "củ hành", "orange": "quả cam", "page": "trang giấy",
  "paint": "sơn", "painting": "bức tranh", "paper": "giấy", "park": "công viên", "part": "phần",
  "pea": "hạt đậu Hà Lan", "pear": "quả lê", "pen": "bút bi", "pencil": "bút chì", "person": "người",
  "pet": "thú cưng", "phone": "điện thoại", "photo": "bức ảnh", "piano": "đàn piano", "picture": "bức tranh",
  "pie": "bánh nướng", "pineapple": "quả dứa", "plane": "máy bay", "playground": "sân chơi", "polar bear": "gấu Bắc Cực",
  "poster": "áp phích", "potato": "củ khoai tây", "question": "câu hỏi", "radio": "đài radio", "rice": "cơm",
  "robot": "người máy", "room": "căn phòng", "rubber": "cục tẩy", "rug": "thảm nhỏ", "ruler": "thước kẻ",
  "sand": "cát", "sausage": "xúc xích", "school": "trường học", "sea": "biển", "sentence": "câu",
  "sheep": "con cừu", "shell": "vỏ sò", "ship": "tàu thủy", "shirt": "áo sơ mi", "shoe": "đôi giày",
  "shop": "cửa hàng", "shorts": "quần đùi", "sister": "chị/em gái", "skateboard": "ván trượt", "skateboarding": "trượt ván",
  "skirt": "chân váy", "smile": "nụ cười", "snake": "con rắn", "soccer": "bóng đá", "sock": "chiếc tất",
  "sofa": "ghế sô-pha", "song": "bài hát", "spider": "con nhện", "sport": "thể thao", "store": "cửa hàng",
  "story": "câu chuyện", "street": "con phố", "sun": "mặt trời", "sweet": "kẹo ngọt", "table": "cái bàn",
  "table tennis": "bóng bàn", "tablet": "máy tính bảng", "tail": "cái đuôi", "teacher": "giáo viên", "teddy": "gấu bông",
  "television": "tivi", "tennis": "quần vợt", "tennis racket": "vợt tennis", "thing": "đồ vật", "tick": "dấu tích",
  "tiger": "con hổ", "today": "hôm nay", "tomato": "quả cà chua", "toy": "đồ chơi", "train": "tàu hỏa",
  "tree": "cái cây", "trousers": "quần dài", "truck": "xe tải", "try": "sự thử", "wall": "bức tường",
  "watch": "đồng hồ đeo tay", "water": "nước", "watermelon": "dưa hấu", "window": "cửa sổ", "woman": "người phụ nữ",
  "word": "từ", "year": "năm",

  // ── STARTERS (Pre-A1) · verbs ─────────────────────────────────────────────
  "add": "thêm vào", "ask": "hỏi", "be": "là", "bounce": "nảy lên", "catch": "bắt lấy",
  "choose": "chọn", "clap": "vỗ tay", "clean": "lau chùi", "close": "đóng lại", "come": "đến",
  "complete": "hoàn thành", "count": "đếm", "do": "làm", "draw": "vẽ", "drive": "lái xe",
  "eat": "ăn", "enjoy": "thích thú", "find": "tìm thấy", "fly": "bay", "get": "nhận được",
  "give": "đưa cho", "go": "đi", "have": "có", "hit": "đánh", "hold": "giữ",
  "jump": "nhảy", "kick": "đá", "know": "biết", "learn": "học", "listen": "lắng nghe",
  "live": "sống", "look": "nhìn", "love": "yêu", "make": "làm ra", "open": "mở",
  "play": "chơi", "point": "chỉ", "put": "đặt", "read": "đọc", "ride": "cưỡi",
  "run": "chạy", "say": "nói", "see": "nhìn thấy", "show": "cho xem", "sing": "hát",
  "sit": "ngồi", "sleep": "ngủ", "spell": "đánh vần", "stand": "đứng", "start": "bắt đầu",
  "stop": "dừng lại", "swim": "bơi", "talk": "nói chuyện", "tell": "kể", "throw": "ném",
  "understand": "hiểu", "walk": "đi bộ", "want": "muốn", "wave": "vẫy tay", "wear": "mặc",
  "write": "viết",

  // ── STARTERS (Pre-A1) · adjectives ────────────────────────────────────────
  "angry": "tức giận", "beautiful": "xinh đẹp", "big": "to lớn", "black": "màu đen", "blue": "màu xanh dương",
  "brown": "màu nâu", "closed": "đã đóng", "cool": "ngầu", "correct": "đúng", "dirty": "bẩn",
  "double": "gấp đôi", "fantastic": "tuyệt vời", "funny": "hài hước", "good": "tốt", "gray": "màu xám",
  "great": "tuyệt", "green": "màu xanh lá", "grey": "màu xám", "happy": "vui vẻ", "long": "dài",
  "new": "mới", "nice": "dễ thương", "old": "cũ", "pink": "màu hồng", "purple": "màu tím",
  "red": "màu đỏ", "sad": "buồn", "scary": "đáng sợ", "short": "ngắn", "silly": "ngớ ngẩn",
  "small": "nhỏ", "ugly": "xấu xí", "white": "màu trắng", "yellow": "màu vàng", "young": "trẻ",

  // ── MOVERS (A1) · nouns ───────────────────────────────────────────────────
  "address": "địa chỉ", "age": "tuổi", "app": "ứng dụng", "aunt": "cô/dì", "back": "phía sau",
  "balcony": "ban công", "band": "ban nhạc", "basement": "tầng hầm", "bat": "con dơi", "beard": "râu quai nón",
  "blanket": "cái chăn", "bottle": "cái chai", "bottom": "phía dưới", "bowl": "cái bát", "break": "giờ nghỉ",
  "building": "tòa nhà", "bus station": "bến xe buýt", "bus stop": "trạm xe buýt", "cage": "cái lồng", "car park": "bãi đỗ xe",
  "centre": "trung tâm", "cheese": "phô mai", "cinema": "rạp chiếu phim", "circle": "hình tròn", "circus": "rạp xiếc",
  "city": "thành phố", "cloud": "đám mây", "clown": "chú hề", "coat": "áo choàng", "coffee": "cà phê",
  "cold": "cảm lạnh", "comic": "truyện tranh", "comic book": "truyện tranh", "cook": "đầu bếp", "cough": "ho",
  "country": "đất nước", "countryside": "vùng nông thôn", "cup": "cái cốc", "dance": "điệu nhảy", "daughter": "con gái",
  "dentist": "nha sĩ", "difference": "sự khác biệt", "doctor": "bác sĩ", "dolphin": "cá heo", "downstairs": "tầng dưới",
  "dream": "giấc mơ", "driver": "tài xế", "e-book": "sách điện tử", "earache": "đau tai", "elevator": "thang máy",
  "email": "thư điện tử", "farm": "nông trại", "farmer": "nông dân", "field": "cánh đồng", "film": "bộ phim",
  "film star": "ngôi sao phim", "forest": "rừng", "friday": "thứ Sáu", "funfair": "hội chợ vui chơi", "goal": "bàn thắng",
  "granddaughter": "cháu gái", "grandparent": "ông bà", "grandson": "cháu trai", "grass": "cỏ", "ground": "mặt đất",
  "grown-up": "người lớn", "headache": "đau đầu", "helmet": "mũ bảo hiểm", "holiday": "kỳ nghỉ", "homework": "bài tập về nhà",
  "hospital": "bệnh viện", "hundred": "một trăm", "ice": "nước đá", "ice skates": "giày trượt băng", "ice skating": "trượt băng",
  "idea": "ý tưởng", "internet": "internet", "island": "hòn đảo", "jungle": "rừng nhiệt đới", "kangaroo": "chuột túi",
  "kind": "loại", "kitten": "mèo con", "lake": "cái hồ", "laptop": "máy tính xách tay", "laugh": "tiếng cười",
  "leaf": "chiếc lá", "library": "thư viện", "lift": "thang máy", "lion": "con sư tử", "machine": "cái máy",
  "map": "bản đồ", "market": "chợ", "matter": "vấn đề", "message": "tin nhắn", "milkshake": "sữa lắc",
  "mistake": "lỗi", "model": "người mẫu", "monday": "thứ Hai", "moon": "mặt trăng", "mountain": "ngọn núi",
  "moustache": "ria mép", "movie": "bộ phim", "neck": "cái cổ", "net": "cái lưới", "noise": "tiếng ồn",
  "noodles": "mì", "nurse": "y tá", "pair": "đôi", "pancake": "bánh kếp", "panda": "gấu trúc",
  "parent": "bố mẹ", "parrot": "con vẹt", "party": "bữa tiệc", "pasta": "mì Ý", "penguin": "chim cánh cụt",
  "picnic": "buổi dã ngoại", "pirate": "cướp biển", "place": "nơi chốn", "plant": "cái cây", "plate": "cái đĩa",
  "player": "người chơi", "pool": "bể bơi", "pop star": "ngôi sao nhạc pop", "practice": "sự luyện tập", "present": "món quà",
  "puppy": "chó con", "rabbit": "con thỏ", "rain": "mưa", "rainbow": "cầu vồng", "river": "dòng sông",
  "road": "con đường", "rock": "hòn đá", "roller skates": "giày trượt pa-tanh", "roller skating": "trượt pa-tanh", "roof": "mái nhà",
  "sail": "cánh buồm", "salad": "món rau trộn", "sandwich": "bánh sandwich", "saturday": "thứ Bảy", "sauce": "nước sốt",
  "scarf": "khăn quàng", "seat": "chỗ ngồi", "shape": "hình dạng", "shark": "cá mập", "shopping": "mua sắm",
  "shoulder": "bờ vai", "shower": "vòi sen", "skate": "giày trượt", "sky": "bầu trời", "snail": "con ốc sên",
  "snow": "tuyết", "son": "con trai", "soup": "món súp", "square": "hình vuông", "stair": "bậc thang",
  "star": "ngôi sao", "station": "nhà ga", "stomach": "dạ dày", "stomach-ache": "đau bụng", "sunday": "Chủ nhật",
  "supermarket": "siêu thị", "sweater": "áo len", "swimming pool": "bể bơi", "swimsuit": "đồ bơi", "tea": "trà",
  "temperature": "nhiệt độ", "text": "tin nhắn", "thursday": "thứ Năm", "ticket": "vé", "tooth": "răng",
  "toothache": "đau răng", "toothbrush": "bàn chải đánh răng", "toothpaste": "kem đánh răng", "top": "phía trên", "towel": "khăn tắm",
  "town": "thị trấn", "tractor": "máy kéo", "treasure": "kho báu", "trip": "chuyến đi", "tuesday": "thứ Ba",
  "uncle": "chú/bác", "upstairs": "tầng trên", "vegetable": "rau củ", "video": "đoạn phim", "village": "ngôi làng",
  "wash": "sự giặt giũ", "waterfall": "thác nước", "weather": "thời tiết", "website": "trang web", "wednesday": "thứ Tư",
  "week": "tuần", "weekend": "cuối tuần", "whale": "cá voi", "wind": "gió", "work": "công việc",
  "world": "thế giới", "yesterday": "hôm qua",

  // ── MOVERS (A1) · verbs ───────────────────────────────────────────────────
  "bring": "mang đến", "build": "xây dựng", "buy": "mua", "call": "gọi", "carry": "mang vác",
  "change": "thay đổi", "climb": "leo trèo", "cry": "khóc", "drop": "đánh rơi", "dry": "làm khô",
  "fall": "ngã", "feed": "cho ăn", "fix": "sửa chữa", "grow": "lớn lên", "help": "giúp đỡ",
  "hide": "trốn", "hop": "nhảy lò cò", "hurt": "làm đau", "invite": "mời", "lose": "làm mất",
  "mean": "có nghĩa là", "move": "di chuyển", "need": "cần", "practise": "luyện tập", "send": "gửi",
  "shout": "hét lên", "skip": "nhảy dây", "take": "lấy", "teach": "dạy", "think": "nghĩ",
  "travel": "đi du lịch", "wait": "chờ đợi", "wake": "thức dậy",

  // ── MOVERS (A1) · adjectives ──────────────────────────────────────────────
  "afraid": "sợ hãi", "asleep": "đang ngủ", "awake": "thức giấc", "bad": "tồi tệ", "best": "tốt nhất",
  "better": "tốt hơn", "blond": "tóc vàng", "boring": "nhàm chán", "brave": "dũng cảm", "brilliant": "xuất sắc",
  "busy": "bận rộn", "careful": "cẩn thận", "clever": "thông minh", "cloudy": "nhiều mây", "curly": "xoăn",
  "dangerous": "nguy hiểm", "different": "khác nhau", "difficult": "khó", "easy": "dễ", "exciting": "hấp dẫn",
  "fair": "công bằng", "famous": "nổi tiếng", "fat": "béo", "fine": "ổn", "first": "đầu tiên",
  "frightened": "hoảng sợ", "hot": "nóng", "huge": "khổng lồ", "hungry": "đói", "ill": "ốm",
  "last": "cuối cùng", "little": "nhỏ bé", "loud": "ồn ào", "naughty": "nghịch ngợm", "pretty": "xinh xắn",
  "quick": "nhanh", "quiet": "yên tĩnh", "safe": "an toàn", "second": "thứ hai", "sick": "ốm",
  "slow": "chậm", "straight": "thẳng", "strong": "khỏe mạnh", "sunny": "nắng", "surprised": "ngạc nhiên",
  "tall": "cao", "terrible": "kinh khủng", "thin": "gầy", "third": "thứ ba", "thirsty": "khát",
  "tired": "mệt", "weak": "yếu", "well": "khỏe", "wet": "ướt", "windy": "lộng gió",
  "worse": "tệ hơn", "worst": "tệ nhất", "wrong": "sai",

};

const normalize = (word: string): string => word.trim().toLowerCase();

// Returns the Vietnamese gloss for a word: the hand-curated entry first, then the
// generated map, or undefined when the word is in neither.
export const getVietnameseMeaning = (word: string | undefined | null): string | undefined => {
  if (!word) return undefined;
  const key = normalize(word);
  return VIETNAMESE_MEANINGS[key] ?? GENERATED_VIETNAMESE_MEANINGS[key];
};

// ── Machine-translation fallback (WiseSpeak pattern) ────────────────────────
// The bundled maps cover the CEFR packs, so anything the player types by hand falls
// through to a key-less client-side translation (see services/translate.ts). Results
// are memoised in memory and persisted to localStorage so a word is only ever
// translated once per device.

import { translateText } from './services/translate';

const CACHE_PREFIX = 'wordcrew_vi_';
const MEMO = new Map<string, string | undefined>();

const readCached = (key: string): string | undefined => {
  try {
    return localStorage.getItem(CACHE_PREFIX + key) || undefined;
  } catch {
    return undefined;
  }
};

const writeCached = (key: string, value: string | undefined): void => {
  try {
    if (value) localStorage.setItem(CACHE_PREFIX + key, value);
  } catch {
    // Quota exceeded / private mode — the hint just won't persist.
  }
};

/**
 * Resolves the Vietnamese hint for a word: the curated gloss when we have one,
 * otherwise a cached client-side translation. Resolves to undefined when no hint
 * can be produced (unknown word + translation unavailable/offline).
 */
export const resolveVietnameseHint = async (word: string | undefined | null): Promise<string | undefined> => {
  const curated = getVietnameseMeaning(word);
  if (curated) return curated;
  if (!word) return undefined;

  const key = normalize(word);
  if (MEMO.has(key)) return MEMO.get(key);

  const cached = readCached(key);
  if (cached) {
    MEMO.set(key, cached);
    return cached;
  }

  const translated = await translateText(word);
  const result = translated?.trim() || undefined;
  MEMO.set(key, result);
  writeCached(key, result);
  return result;
};
