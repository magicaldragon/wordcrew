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

  // The endpoint echoes a few words back unchanged. Most are loanwords whose Vietnamese
  // spelling *is* the English one ("pizza", "vitamin"), but these two are not: an echo
  // teaches nothing for "critically", and "bang" is a different Vietnamese word.
  "bang": "tiếng nổ; đập mạnh",
  "critically": "một cách nghiêm trọng",

  // Two words no bundled list reaches, though their plurals are common in a lesson
  // ("geese", "thieves"). wordForms only knows how to strip a plural, so the singular
  // has to exist for those to resolve.
  "goose": "con ngỗng", "thief": "kẻ trộm",

  // "runner" came back as "Á hậu" (a runner-up in a beauty pageant) in a KET unit about
  // sport; the word is the person who runs.
  "runner": "người chạy; vận động viên chạy",

  // Compound topics the generator translated too literally: a "gap year" is not an
  // empty year, and "peer pressure" comes from one's own age group.
  "gap year": "năm nghỉ học tạm thời",
  "peer pressure": "áp lực đồng trang lứa",

};

// ── Words with more than one sense ──────────────────────────────────────────
//
// A pasted list gives a word, not a meaning, and English is full of words that carry
// several. The dictionary can only offer one gloss, so the generator's answer is the
// most common sense — and for a lesson that used another sense ("the bank of the river",
// "a break between classes") that gloss quietly points the class at the wrong meaning.
//
// Three things keep that from becoming a bug:
//   1. this map lists the senses a school list actually uses, most common first,
//      separated by "; " so the teacher can pick the one from the lesson;
//   2. the deck review table lets the teacher overwrite any gloss before saving, and a
//      typed meaning always wins over anything here;
//   3. the generator skips every key that appears in this file (it scans for the
//      "key": shape), so a generated one-sense gloss never competes with these.
//
// Only senses worth teaching are listed — not every dictionary meaning. Order matters:
// the first sense is the one the hint shows alone in game modes.
export const POLYSEMOUS_MEANINGS: Record<string, string> = {
  "bank": "ngân hàng; bờ sông",
  "bark": "vỏ cây; tiếng sủa",
  "bat": "con dơi; gậy đánh bóng",
  "bear": "con gấu; chịu đựng",
  "board": "cái bảng; lên tàu, lên máy bay",
  "book": "quyển sách; đặt trước",
  "bow": "cúi chào; cái nơ",
  "break": "làm vỡ; giờ nghỉ",
  "capital": "thủ đô; nguồn vốn; chữ hoa",
  "case": "trường hợp; cái va li",
  "change": "thay đổi; tiền lẻ",
  "charge": "tính phí; sạc pin",
  "class": "lớp học; tầng lớp",
  "close": "đóng lại; gần gũi",
  "coach": "huấn luyện viên; xe khách",
  "company": "công ty; sự đồng hành",
  "content": "nội dung; hài lòng",
  "contract": "hợp đồng; co lại",
  "count": "đếm; bá tước",
  "course": "khóa học; món ăn",
  "court": "tòa án; sân thể thao",
  "cross": "băng qua; cây thánh giá",
  "current": "hiện tại; dòng điện",
  "date": "ngày tháng; cuộc hẹn hò",
  "dish": "món ăn; cái đĩa",
  "dress": "váy liền; mặc quần áo",
  "fair": "công bằng; hội chợ",
  "fall": "ngã; mùa thu",
  "fan": "người hâm mộ; cái quạt",
  "figure": "con số; vóc dáng",
  "fine": "ổn, tốt; tiền phạt",
  "firm": "công ty; vững chắc",
  "fly": "bay; con ruồi",
  "foot": "bàn chân; chân núi",
  "form": "hình thức; mẫu đơn",
  "glass": "thủy tinh; cái ly",
  "grade": "lớp học; điểm số",
  "ground": "mặt đất; lý do",
  "head": "cái đầu; đứng đầu",
  "iron": "sắt; bàn là",
  "issue": "vấn đề; phát hành",
  "jam": "mứt; tắc đường",
  "key": "chìa khóa; phím",
  "kind": "loại; tốt bụng",
  "last": "cuối cùng; kéo dài",
  "lead": "dẫn đầu; chì",
  "leave": "rời đi; nghỉ phép",
  "lie": "nằm; nói dối",
  "light": "ánh sáng; nhẹ",
  "line": "đường kẻ; xếp hàng",
  "live": "sống; trực tiếp",
  "match": "trận đấu; que diêm; phù hợp",
  "matter": "vấn đề; quan trọng",
  "mean": "có nghĩa là; keo kiệt",
  "mind": "tâm trí; thấy phiền",
  "mine": "của tôi; mỏ khoáng sản",
  "miss": "bỏ lỡ; nhớ nhung",
  "nail": "cái đinh; móng tay",
  "note": "ghi chú; tờ tiền",
  "object": "đồ vật; phản đối",
  "order": "đặt hàng; thứ tự",
  "park": "công viên; đỗ xe",
  "party": "bữa tiệc; đảng phái",
  "period": "thời kỳ; tiết học",
  "pilot": "phi công; thử nghiệm",
  "pitch": "sân bóng; cao độ",
  "plant": "cái cây; trồng; nhà máy",
  "plate": "cái đĩa; biển số xe",
  "pool": "bể bơi; gộp chung",
  "post": "bưu phẩm; đăng bài",
  "pound": "cân Anh; đồng bảng Anh",
  "pounds": "cân Anh; đồng bảng Anh",
  "power": "sức mạnh; nguồn điện",
  "present": "hiện tại; món quà; trình bày",
  "press": "nhấn; báo chí",
  "project": "dự án; chiếu lên",
  "race": "cuộc đua; chủng tộc",
  "range": "phạm vi; dãy núi",
  "record": "ghi lại; kỷ lục",
  "rest": "nghỉ ngơi; phần còn lại",
  "right": "đúng; bên phải; quyền",
  "ring": "cái nhẫn; rung chuông",
  "rock": "hòn đá; nhạc rock",
  "row": "hàng; chèo thuyền",
  "run": "chạy; điều hành",
  "save": "cứu; tiết kiệm",
  "scale": "quy mô; cái cân",
  "season": "mùa; nêm gia vị",
  "set": "bộ; thiết lập",
  "share": "chia sẻ; cổ phần",
  "ship": "tàu thủy; vận chuyển",
  "shoot": "bắn; chụp ảnh",
  "short": "ngắn; thiếu",
  "sign": "biển báo; ký tên",
  "sound": "âm thanh; nghe có vẻ",
  "spell": "đánh vần; phép thuật",
  "spring": "mùa xuân; lò xo",
  "stand": "đứng; quầy hàng",
  "state": "bang; trạng thái; nêu rõ",
  "stick": "cây gậy; dính",
  "store": "cửa hàng; lưu trữ",
  "strike": "đình công; đánh",
  "subject": "môn học; chủ đề",
  "suit": "bộ com lê; phù hợp",
  "table": "cái bàn; bảng số liệu",
  "tank": "bể chứa; xe tăng",
  "tap": "vòi nước; gõ nhẹ",
  "term": "học kỳ; thuật ngữ",
  "tie": "cà vạt; buộc; hòa",
  "tip": "lời khuyên; tiền boa",
  "top": "đỉnh; áo",
  "train": "tàu hỏa; huấn luyện",
  "treat": "điều trị; đối xử",
  "trip": "chuyến đi; vấp ngã",
  "trunk": "thân cây; cốp xe",
  "turn": "lượt; rẽ",
  "type": "loại; đánh máy",
  "wave": "làn sóng; vẫy tay",
  "way": "cách; con đường",
  "wear": "mặc; hao mòn",
  "well": "khỏe; cái giếng",
  "wing": "cánh; cánh gà",
  "work": "công việc; có tác dụng",
  "yard": "sân; thước Anh",
};

const normalize = (word: string): string =>
  word.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');

/** Removes the notes and punctuation a pasted list carries: "bank (n.)", "to run". */
const stripAnnotations = (key: string): string =>
  key
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[.,;:!?"“”]/g, '')
    .replace(/^to\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Forms a pasted list may carry instead of the dictionary's base form: plurals
 * ("berries"), participles ("running"), comparatives ("bigger"), adverbs ("happily")
 * and hyphen/space spellings ("ice-cream"). Pure string work over the two bundled
 * maps, so a hit costs nothing — no translation API is contacted.
 */
const wordForms = (key: string): string[] => {
  const forms: string[] = [];
  const add = (form: string) => {
    if (form && form !== key && !forms.includes(form)) forms.push(form);
  };

  add(key.replace(/-/g, ' ').replace(/\s+/g, ' ').trim());
  add(key.replace(/\s+/g, '-'));
  if (/'s$/.test(key)) add(key.slice(0, -2));

  // Plurals / third person: berries → berry, boxes → box, bags → bag.
  if (/ies$/.test(key)) add(key.slice(0, -3) + 'y');
  if (/(ches|shes|sses|xes|zes|oes)$/.test(key)) add(key.slice(0, -2));
  if (/[^s]s$/.test(key)) add(key.slice(0, -1));

  // -ves plurals: wolves → wolf, halves → half, shelves → shelf, lives → life.
  if (/ves$/.test(key)) {
    const stem = key.slice(0, -3);
    add(stem + 'f');
    add(stem + 'fe');
  }
  // The one plural no suffix rule reaches.
  if (key === 'geese') add('goose');

  // Plurals English borrows from Latin and Greek, which a unit list uses as readily as
  // the singular: analyses → analysis, phenomena → phenomenon, stimuli → stimulus,
  // formulae → formula. Both stems are offered and only a hit is used, so a wrong one
  // costs nothing.
  if (/es$/.test(key)) add(key.slice(0, -2) + 'is');
  if (/a$/.test(key)) {
    add(key.slice(0, -1) + 'on');
    add(key.slice(0, -1) + 'um');
  }
  if (/i$/.test(key)) add(key.slice(0, -1) + 'us');
  if (/ae$/.test(key)) add(key.slice(0, -2) + 'a');

  // -ing / -ed: running → run, making → make, studied → study.
  for (const [suffix, cut] of [['ing', 3], ['ed', 2]] as const) {
    if (!key.endsWith(suffix) || key.length <= cut + 1) continue;
    const stem = key.slice(0, -cut);
    add(stem);
    add(stem + 'e');
    if (key.endsWith('ied')) add(key.slice(0, -3) + 'y');
    if (/([b-df-hj-np-tv-z])\1$/.test(stem)) add(stem.slice(0, -1));
  }

  // Comparatives / superlatives: bigger → big, happier → happy.
  if (/ier$/.test(key)) add(key.slice(0, -3) + 'y');
  if (/iest$/.test(key)) add(key.slice(0, -4) + 'y');
  if (/(er|est)$/.test(key)) {
    const stem = key.replace(/(er|est)$/, '');
    add(stem);
    add(stem + 'e');
    if (/([b-df-hj-np-tv-z])\1$/.test(stem)) add(stem.slice(0, -1));
  }

  // Adverbs: happily → happy, quickly → quick.
  if (/ily$/.test(key)) add(key.slice(0, -3) + 'y');
  else if (/ly$/.test(key)) add(key.slice(0, -2));

  return forms;
};

// Most specific first: a multi-sense entry beats the hand-curated single sense, which
// beats the generated gloss. Kept as one chain so every caller resolves a word the same
// way — the solo hint, the deck builder and the flashcard back all read through here.
const lookup = (key: string): string | undefined =>
  POLYSEMOUS_MEANINGS[key] ?? VIETNAMESE_MEANINGS[key] ?? GENERATED_VIETNAMESE_MEANINGS[key];

/**
 * British and American spellings of the same word: "apologise"/"apologize",
 * "behaviour"/"behavior", "centre"/"center", "catalogue"/"catalog". Textbooks here use
 * the British forms while the bundled lists came from an American corpus, so a word the
 * teacher just taught would miss on spelling alone. Candidates are only used when they
 * hit an entry, so a wrong guess is free and cannot invent a meaning.
 */
const spellingVariants = (key: string): string[] => {
  const forms: string[] = [];
  const add = (form: string) => {
    if (form && form !== key && !forms.includes(form)) forms.push(form);
  };

  // -ise / -ize, including the inflected endings a pasted list carries.
  add(
    key
      .replace(/isation(s?)$/, 'ization$1')
      .replace(/ise(s|d)?$/, 'ize$1')
      .replace(/ising$/, 'izing'),
  );
  add(
    key
      .replace(/ization(s?)$/, 'isation$1')
      .replace(/ize(s|d)?$/, 'ise$1')
      .replace(/izing$/, 'ising'),
  );

  // -our / -or: colour, favourite, neighbour, honour.
  add(key.replace(/our(s?)$/, 'or$1'));
  add(key.replace(/or(s?)$/, 'our$1'));

  // -re / -er: centre, metre, theatre, fibre.
  add(key.replace(/re(s?)$/, 'er$1'));
  add(key.replace(/er(s?)$/, 're$1'));

  // -ogue / -og: catalogue, dialogue.
  add(key.replace(/ogue(s?)$/, 'og$1'));
  add(key.replace(/og(s?)$/, 'ogue$1'));

  return forms;
};

// Lookup that accepts either spelling. Kept separate from wordForms because spelling and
// morphology are independent: "apologised" needs the -ed stripped *and* the s turned
// into a z, so each form is retried through both.
const lookupAny = (key: string): string | undefined => {
  const direct = lookup(key);
  if (direct) return direct;
  for (const variant of spellingVariants(key)) {
    const hit = lookup(variant);
    if (hit) return hit;
  }
  return undefined;
};

// Returns the Vietnamese gloss for a word: the hand-curated entry first, then the
// generated map, or undefined when the word is in neither. Both maps ship with the app,
// so this is synchronous and offline — there is no runtime translation to fall back on.
// Misses are retried against the word's other forms before giving up, which is where a
// pasted list ("journeys", "running", "bank (n.)") usually lands.
export const getVietnameseMeaning = (word: string | undefined | null): string | undefined => {
  if (!word) return undefined;
  const key = normalize(word);
  if (!key) return undefined;

  const direct = lookupAny(key);
  if (direct) return direct;

  const cleaned = stripAnnotations(key);
  if (!cleaned) return undefined;
  if (cleaned !== key) {
    const stripped = lookupAny(cleaned);
    if (stripped) return stripped;
  }

  for (const form of wordForms(cleaned)) {
    const hit = lookupAny(form);
    if (hit) return hit;
  }
  return undefined;
};

/**
 * The gloss to show as an in-game hint. A borrowed word comes back unchanged ("pizza" →
 * "pizza"): a correct meaning for the deck, but a hint that says nothing, so it is
 * treated as no hint and the game falls through to the next rung.
 */
export const getHintMeaning = (word: string | undefined | null): string | undefined => {
  const meaning = getVietnameseMeaning(word);
  if (!meaning || !word) return undefined;
  return meaning.trim().toLowerCase() === normalize(word) ? undefined : meaning;
};
