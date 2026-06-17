// 一次性 seed 脚本：往 media_items 表插入 50 部热门影视
// 运行方式： pnpm tsx scripts/seed.ts
// 不需要 LLM 资源，体验稳定
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  try {
    require('dotenv').config();
  } catch {
    // ignore
  }
  if (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }
  // 回退：调用 Python SDK 拿项目环境变量
  const { execSync } = require('child_process') as typeof import('child_process');
  try {
    const out = execSync(
      `python3 -c "from coze_workload_identity import Client; c=Client(); vs=c.get_project_env_vars(); c.close(); [print(f'{v.key}={v.value}') for v in vs]"`,
      { encoding: 'utf8' },
    );
    for (const line of out.split('\n')) {
      const idx = line.indexOf('=');
      if (idx > 0) {
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        if (k && !process.env[k]) process.env[k] = v;
      }
    }
  } catch (e) {
    console.error('加载 env 失败:', e);
  }
}

loadEnv();

const supabase = createClient(
  process.env.COZE_SUPABASE_URL!,
  process.env.COZE_SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

interface SeedItem {
  title: string;
  original_title?: string | null;
  type: 'movie' | 'tv';
  year: number;
  director?: string;
  actors?: string[];
  genre?: string[];
  region?: string;
  description: string;
  rating: number;
  poster_primary: string;
  poster_secondary: string;
}

const SEEDS: SeedItem[] = [
  { title: '肖申克的救赎', original_title: 'The Shawshank Redemption', type: 'movie', year: 1994, director: '弗兰克·达拉邦特', actors: ['蒂姆·罗宾斯', '摩根·弗里曼'], genre: ['剧情', '犯罪'], region: '美国', description: '银行家安迪被冤枉入狱，在肖申克监狱中与瑞德成为好友，用智慧与希望影响狱友，最终越狱重获自由。', rating: 9.7, poster_primary: '1a2433', poster_secondary: '3d4f5c' },
  { title: '霸王别姬', original_title: null, type: 'movie', year: 1993, director: '陈凯歌', actors: ['张国荣', '张丰毅', '巩俐'], genre: ['剧情', '爱情'], region: '中国大陆', description: '程蝶衣与段小楼是一对京剧伶人，从民国到文革，两人命运随时代起伏。程蝶衣的不疯魔不成活，是对艺术与爱最决绝的注解。', rating: 9.6, poster_primary: '2a1810', poster_secondary: '6b3a25' },
  { title: '阿甘正传', original_title: 'Forrest Gump', type: 'movie', year: 1994, director: '罗伯特·泽米吉斯', actors: ['汤姆·汉克斯'], genre: ['剧情', '爱情'], region: '美国', description: '智商不高但善良执着的阿甘，经历美国战后数十年风云，跑遍全国，遇见肯尼迪、约翰逊，与珍妮的爱情贯穿始终。', rating: 9.5, poster_primary: '8aa875', poster_secondary: '3d5c4a' },
  { title: '泰坦尼克号', original_title: 'Titanic', type: 'movie', year: 1997, director: '詹姆斯·卡梅隆', actors: ['莱昂纳多·迪卡普里奥', '凯特·温斯莱特'], genre: ['剧情', '爱情', '灾难'], region: '美国', description: '穷画家杰克与贵族少女罗丝在豪华邮轮上相爱，巨轮撞上冰山沉没，他们用生命书写一段永不沉没的爱情。', rating: 9.5, poster_primary: '0d1b2c', poster_secondary: '2a4a6a' },
  { title: '盗梦空间', original_title: 'Inception', type: 'movie', year: 2010, director: '克里斯托弗·诺兰', actors: ['莱昂纳多·迪卡普里奥', '约瑟夫·高登-莱维特'], genre: ['科幻', '悬疑', '动作'], region: '美国', description: '柯布是技艺高超的盗梦师，能潜入他人梦境窃取秘密。这次他接到任务：不是偷，而是把一个想法植入目标梦境。', rating: 9.4, poster_primary: '1c1f2b', poster_secondary: '4a5c7a' },
  { title: '千与千寻', original_title: '千と千尋の神隠し', type: 'movie', year: 2001, director: '宫崎骏', actors: ['柊瑠美', '入野自由'], genre: ['动画', '奇幻'], region: '日本', description: '少女千寻误入神灵世界，父母变成猪，她在汤婆婆的澡堂工作，找回自己的名字才能回家。', rating: 9.4, poster_primary: '4a2c5c', poster_secondary: '8a6b9c' },
  { title: '让子弹飞', original_title: null, type: 'movie', year: 2010, director: '姜文', actors: ['姜文', '葛优', '周润发'], genre: ['剧情', '动作', '喜剧'], region: '中国大陆', description: '民国年间，土匪张牧之当上鹅城县长，与当地恶霸黄四郎斗智斗勇。姜文式黑色幽默的巅峰。', rating: 9.0, poster_primary: '3a1a0a', poster_secondary: '7a4a2a' },
  { title: '星际穿越', original_title: 'Interstellar', type: 'movie', year: 2014, director: '克里斯托弗·诺兰', actors: ['马修·麦康纳', '安妮·海瑟薇'], genre: ['科幻', '剧情'], region: '美国', description: '地球濒临灭亡，前 NASA 飞行员库珀穿越虫洞，为人类寻找新家园。父女之间的爱超越时空。', rating: 9.4, poster_primary: '0a0a14', poster_secondary: '1f2a3a' },
  { title: '忠犬八公的故事', original_title: 'Hachi: A Dog\'s Tale', type: 'movie', year: 2009, director: '拉斯·霍尔斯道姆', actors: ['理查·基尔'], genre: ['剧情'], region: '美国', description: '教授帕克在车站偶遇一只走失的小狗，取名八公。每天八公送他出门、等他归来，直到有一天帕克再也回不来……', rating: 9.4, poster_primary: '5a4a2a', poster_secondary: '8a7a5a' },
  { title: '海上钢琴师', original_title: 'La leggenda del pianista sull\'oceano', type: 'movie', year: 1998, director: '朱塞佩·托纳多雷', actors: ['蒂姆·罗斯'], genre: ['剧情', '音乐'], region: '意大利', description: '1900 一生未下过弗吉尼亚号邮轮，用琴声讲述所见的每一个故事。当船即将被炸毁，他选择与船同生共死。', rating: 9.3, poster_primary: '1a1410', poster_secondary: '4a3a28' },
  { title: '三傻大闹宝莱坞', original_title: '3 Idiots', type: 'movie', year: 2009, director: '拉吉库马尔·希拉尼', actors: ['阿米尔·汗'], genre: ['剧情', '喜剧'], region: '印度', description: '三个工程学院的学生挑战死板教育体制，傻子兰彻用行动证明：追求卓越，成功自会追上你。', rating: 9.2, poster_primary: '6a3a1a', poster_secondary: 'a06a2a' },
  { title: '放牛班的春天', original_title: 'Les Choristes', type: 'movie', year: 2004, director: '克里斯托夫·巴拉蒂', actors: ['热拉尔·朱尼奥'], genre: ['剧情', '音乐'], region: '法国', description: '失意音乐家马修来到"池塘之底"寄宿学校，用合唱团改变了一群问题孩子的命运。', rating: 9.3, poster_primary: '3a2818', poster_secondary: '7a5a2a' },
  { title: '无间道', original_title: null, type: 'movie', year: 2002, director: '刘伟强', actors: ['刘德华', '梁朝伟'], genre: ['剧情', '悬疑', '犯罪'], region: '香港', description: '警方卧底陈永仁与黑帮卧底刘建明在无间地狱中挣扎。身份错位，善恶难辨。', rating: 9.3, poster_primary: '0a0a1a', poster_secondary: '3a3a5a' },
  { title: '触不可及', original_title: 'Intouchables', type: 'movie', year: 2011, director: '奥利维埃·纳卡什', actors: ['弗朗索瓦·克鲁塞', '奥马·希'], genre: ['剧情', '喜剧'], region: '法国', description: '富翁菲利普因跳伞事故瘫痪，聘请街头青年德里斯为护工，两人跨越阶层的友谊温暖人心。', rating: 9.3, poster_primary: '4a3a2a', poster_secondary: '8a6a4a' },
  { title: '天空之城', original_title: '天空の城ラピュタ', type: 'movie', year: 1986, director: '宫崎骏', actors: ['田中真弓', '横泽啓子'], genre: ['动画', '奇幻', '冒险'], region: '日本', description: '少女希达与少年巴鲁寻找传说中的天空之城拉普达。宫崎骏写给飞行与勇气的情书。', rating: 9.2, poster_primary: '2a4a6a', poster_secondary: '6a8aaa' },
  { title: '龙猫', original_title: 'となりのトトロ', type: 'movie', year: 1988, director: '宫崎骏', actors: ['日高法子', '坂本千夏'], genre: ['动画', '奇幻'], region: '日本', description: '小月和小梅跟随爸爸搬到乡下，遇见森林守护者龙猫。宫崎骏最温柔的一部。', rating: 9.2, poster_primary: '3a5a2a', poster_secondary: '7a9a4a' },
  { title: '寄生虫', original_title: '기생충', type: 'movie', year: 2019, director: '奉俊昊', actors: ['宋康昊', '李善均'], genre: ['剧情', '悬疑'], region: '韩国', description: '贫穷的金家四口伪装身份，陆续渗透进富裕的朴家。两个家庭碰撞出黑色幽默与社会寓言。', rating: 8.8, poster_primary: '1a2a1a', poster_secondary: '4a6a3a' },
  { title: '搏击俱乐部', original_title: 'Fight Club', type: 'movie', year: 1999, director: '大卫·芬奇', actors: ['布拉德·皮特', '爱德华·诺顿'], genre: ['剧情', '悬疑'], region: '美国', description: '失眠的白领与叛逆的肥皂商泰勒创立搏击俱乐部，反抗消费主义与中产空虚。结局令人战栗。', rating: 9.0, poster_primary: '1a1414', poster_secondary: '4a2a2a' },
  { title: '辛德勒的名单', original_title: 'Schindler\'s List', type: 'movie', year: 1993, director: '史蒂文·斯皮尔伯格', actors: ['连姆·尼森', '拉尔夫·费因斯'], genre: ['剧情', '历史', '战争'], region: '美国', description: '二战期间，德国商人辛德勒雇佣犹太工人，让他们免于屠杀。黑白色调中的红衣女孩是影史经典。', rating: 9.5, poster_primary: '0a0a0a', poster_secondary: '3a3a3a' },
  { title: '教父', original_title: 'The Godfather', type: 'movie', year: 1972, director: '弗朗西斯·福特·科波拉', actors: ['马龙·白兰度', '阿尔·帕西诺'], genre: ['剧情', '犯罪'], region: '美国', description: '黑手党家族柯里昂的权力交接与血腥复仇。"给他一个无法拒绝的理由"是影史经典台词。', rating: 9.5, poster_primary: '1a0a0a', poster_secondary: '4a1a0a' },
  { title: '琅琊榜', original_title: null, type: 'tv', year: 2015, director: '孔笙', actors: ['胡歌', '王凯', '刘涛'], genre: ['剧情', '古装'], region: '中国大陆', description: '梅长苏以病弱之躯搅动朝堂风云，为赤焰军昭雪。他步步为营，举手投足皆是风骨。', rating: 9.4, poster_primary: '2a1a0a', poster_secondary: '6a3a1a' },
  { title: '隐秘的角落', original_title: null, type: 'tv', year: 2020, director: '辛爽', actors: ['秦昊', '王景春', '荣梓杉'], genre: ['悬疑', '犯罪'], region: '中国大陆', description: '三个孩子在景区游玩时无意录下谋杀案，由此卷入一场成人世界的博弈。"爬山吗"成为年度梗。', rating: 8.8, poster_primary: '1a2020', poster_secondary: '3a4a4a' },
  { title: '狂飙', original_title: null, type: 'tv', year: 2023, director: '徐纪周', actors: ['张译', '张颂文'], genre: ['剧情', '犯罪'], region: '中国大陆', description: '刑警安欣与黑恶势力头目高启强长达 20 年的正邪较量。一部扫黑除恶的时代群像。', rating: 8.7, poster_primary: '0a0a14', poster_secondary: '2a2a3a' },
  { title: '漫长的季节', original_title: null, type: 'tv', year: 2023, director: '辛爽', actors: ['范伟', '秦昊', '陈明昊'], genre: ['悬疑', '剧情'], region: '中国大陆', description: '东北小城桦钢，20 年前的碎尸案。火车司机王响追凶半生，"往前看，别回头"是年度最动人台词。', rating: 9.4, poster_primary: '3a2a0a', poster_secondary: '7a5a1a' },
  { title: '庆余年', original_title: null, type: 'tv', year: 2019, director: '孙皓', actors: ['张若昀', '李沁', '陈道明'], genre: ['剧情', '古装', '喜剧'], region: '中国大陆', description: '现代人范闲穿越到类似古代的庆国，凭借现代知识在庙堂江湖翻云覆雨。', rating: 8.0, poster_primary: '2a1a0a', poster_secondary: '5a3a1a' },
  { title: '繁花', original_title: null, type: 'tv', year: 2023, director: '王家卫', actors: ['胡歌', '马伊琍', '唐嫣'], genre: ['剧情', '爱情'], region: '中国大陆', description: '90 年代上海，阿宝从无名小卒成为商界弄潮儿。王家卫镜头下的上海霓虹与时代洪流。', rating: 8.7, poster_primary: '1a0a14', poster_secondary: '5a1a3a' },
  { title: '黑镜', original_title: 'Black Mirror', type: 'tv', year: 2011, director: '乔·赖特', actors: ['丹尼尔·卡卢亚', '海莉·阿特维尔'], genre: ['科幻', '悬疑'], region: '英国', description: '独立剧集，每集一个关于科技与人性的黑色寓言。当我们沉迷屏幕，谁在看我们？', rating: 9.0, poster_primary: '0a0a14', poster_secondary: '1a1a3a' },
  { title: '绝命毒师', original_title: 'Breaking Bad', type: 'tv', year: 2008, director: '文斯·吉利根', actors: ['布莱恩·克兰斯顿', '亚伦·保尔'], genre: ['剧情', '犯罪', '悬疑'], region: '美国', description: '化学老师沃尔特被诊断肺癌晚期，制毒贩毒，从懦弱教师蜕变为毒枭"海森堡"。', rating: 9.6, poster_primary: '3a4a1a', poster_secondary: '7a8a2a' },
  { title: '权力的游戏', original_title: 'Game of Thrones', type: 'tv', year: 2011, director: '戴维·贝尼奥夫', actors: ['肖恩·宾', '艾米莉亚·克拉克', '基特·哈灵顿'], genre: ['奇幻', '剧情'], region: '美国', description: '维斯特洛大陆上的七大家族争夺铁王座。史诗级群像，权谋、背叛、龙的火焰。', rating: 9.0, poster_primary: '0a1414', poster_secondary: '2a3a4a' },
  { title: '老友记', original_title: 'Friends', type: 'tv', year: 1994, director: '大卫·克拉尼', actors: ['詹妮弗·安妮斯顿', '柯特妮·考克斯', '马修·派瑞'], genre: ['喜剧', '爱情'], region: '美国', description: '六个年轻人住在纽约曼哈顿的公寓里，10 年间一起笑、哭、恋爱、成长。最经典的美式情景喜剧。', rating: 9.7, poster_primary: '5a3a2a', poster_secondary: 'a07a4a' },
  { title: '风骚律师', original_title: 'Better Call Saul', type: 'tv', year: 2015, director: '文斯·吉利根', actors: ['鲍勃·奥登科克', '乔纳森·班克斯'], genre: ['剧情', '犯罪'], region: '美国', description: '《绝命毒师》前传，讲述小律师索尔·古德曼如何一步步走向那个我们熟悉的老狐狸。', rating: 9.5, poster_primary: '3a2a1a', poster_secondary: '7a5a2a' },
  { title: '怪奇物语', original_title: 'Stranger Things', type: 'tv', year: 2016, director: '马特·达菲', actors: ['米莉·博比·布朗', '大卫·哈伯'], genre: ['科幻', '悬疑', '恐怖'], region: '美国', description: '80 年代小镇，一个男孩神秘失踪，一群孩子进入颠倒世界。复古与惊悚的完美融合。', rating: 9.0, poster_primary: '1a000a', poster_secondary: '4a1a3a' },
  { title: '请回答 1988', original_title: '응답하라 1988', type: 'tv', year: 2015, director: '申源浩', actors: ['李惠利', '朴宝剑', '柳俊烈'], genre: ['剧情', '喜剧', '爱情'], region: '韩国', description: '首尔双门洞五条街的邻里故事。1988 年的青春、亲情与初恋，温暖催泪。', rating: 9.7, poster_primary: '4a2a1a', poster_secondary: '8a5a2a' },
  { title: '大明王朝 1566', original_title: null, type: 'tv', year: 2007, director: '张黎', actors: ['陈宝国', '黄志忠'], genre: ['剧情', '历史'], region: '中国大陆', description: '嘉靖年间，朝廷与江南织造局、清流的权力博弈。中国历史剧的天花板。', rating: 9.8, poster_primary: '1a140a', poster_secondary: '4a3a1a' },
  { title: '走向共和', original_title: null, type: 'tv', year: 2003, director: '张黎', actors: ['王冰', '吕中', '马少骅'], genre: ['剧情', '历史'], region: '中国大陆', description: '从晚清到辛亥革命，孙中山、慈禧、李鸿章、袁世凯……近代中国的思想激荡。', rating: 9.7, poster_primary: '0a0a1a', poster_secondary: '2a2a3a' },
  { title: '甄嬛传', original_title: null, type: 'tv', year: 2011, director: '郑晓龙', actors: ['孙俪', '陈建斌', '蔡少芬'], genre: ['剧情', '古装'], region: '中国大陆', description: '少女甄嬛选秀入宫，从单纯到腹黑，宫斗剧的巅峰之作。"臣妾做不到啊"成全民台词。', rating: 9.3, poster_primary: '2a0a1a', poster_secondary: '6a1a3a' },
  { title: '觉醒年代', original_title: null, type: 'tv', year: 2021, director: '张永新', actors: ['于和伟', '张桐'], genre: ['剧情', '历史'], region: '中国大陆', description: '从新文化运动到中国共产党成立，陈独秀、李大钊、毛泽东等先驱的燃情岁月。', rating: 9.3, poster_primary: '1a0a0a', poster_secondary: '4a1a1a' },
  { title: '我的天才女友', original_title: 'L\'amica geniale', type: 'tv', year: 2018, director: 'Saverio Costanzo', actors: ['玛格丽塔·马祖可', '盖娅·吉拉切'], genre: ['剧情'], region: '意大利', description: '那不勒斯贫民区里，莱农和莉拉从童年到成年的友谊与竞争。费兰特"那不勒斯四部曲"改编。', rating: 9.4, poster_primary: '1a1414', poster_secondary: '4a3a4a' },
  { title: '火线', original_title: 'The Wire', type: 'tv', year: 2002, director: '大卫·西蒙', actors: ['多米尼克·韦斯特', '伊德里斯·艾尔巴'], genre: ['剧情', '犯罪'], region: '美国', description: '巴尔的摩毒品链条上的警匪、瘾君子、码头工、教师，每一季聚焦一个侧面。社会派美剧神作。', rating: 9.5, poster_primary: '0a1414', poster_secondary: '2a3a3a' },
  { title: '瑞克和莫蒂', original_title: 'Rick and Morty', type: 'tv', year: 2013, director: '贾斯汀·罗兰', actors: ['贾斯汀·罗兰', '克里斯·帕内尔'], genre: ['动画', '科幻', '喜剧'], region: '美国', description: '疯狂科学家瑞克带着外孙莫蒂穿梭多元宇宙。哲学、虚无主义、无厘头融为一炉。', rating: 9.6, poster_primary: '1a3a4a', poster_secondary: '5a9aaa' },
  { title: '是，首相', original_title: 'Yes, Minister', type: 'tv', year: 1980, director: '乔纳森·林恩', actors: ['保罗·爱丁顿', '奈杰尔·霍桑'], genre: ['喜剧'], region: '英国', description: '新任大臣汉弗瑞与他精明的常任秘书之间的官僚体系攻防战。政治讽刺喜剧的不朽之作。', rating: 9.6, poster_primary: '1a1410', poster_secondary: '4a3a1a' },
  { title: '潜伏', original_title: null, type: 'tv', year: 2009, director: '姜伟', actors: ['孙红雷', '姚晨'], genre: ['剧情', '悬疑'], region: '中国大陆', description: '1945 年军统余则成弃暗投明，潜伏在国民党天津站，与翠平的假夫妻关系是最大亮点。', rating: 9.3, poster_primary: '1a0a0a', poster_secondary: '4a1a0a' },
  { title: '琅琊榜之风起长林', original_title: null, type: 'tv', year: 2017, director: '孔笙', actors: ['黄晓明', '刘昊然'], genre: ['剧情', '古装'], region: '中国大陆', description: '《琅琊榜》续作，萧平章、萧平旌兄弟戍守大梁北部，朝堂风云再起。', rating: 8.5, poster_primary: '2a1a0a', poster_secondary: '6a3a1a' },
  { title: '来自星星的你', original_title: '별에서 온 그대', type: 'tv', year: 2013, director: '张太维', actors: ['金秀贤', '全智贤'], genre: ['爱情', '奇幻'], region: '韩国', description: '外星人都敏俊在地球生活了 400 年，与国民女神千颂伊坠入爱河。', rating: 8.4, poster_primary: '1a0a14', poster_secondary: '5a2a6a' },
  { title: '信号', original_title: '시그널', type: 'tv', year: 2016, director: '金元锡', actors: ['李帝勋', '赵震雄'], genre: ['悬疑', '犯罪'], region: '韩国', description: '老旧对讲机连接 1989 年与 2015 年两个时代的刑警，联手破获多年悬案。', rating: 9.2, poster_primary: '0a0a1a', poster_secondary: '2a2a4a' },
  { title: '无证之罪', original_title: null, type: 'tv', year: 2017, director: '吕行', actors: ['秦昊', '邓家佳', '姚橹'], genre: ['悬疑', '犯罪'], region: '中国大陆', description: '哈尔滨"雪人"连环杀人案，律师与刑警卷入迷雾。"请警察吃饭"成经典梗。', rating: 8.4, poster_primary: '0a0a14', poster_secondary: '2a2a3a' },
  { title: '摩斯探长前传', original_title: 'Endeavour', type: 'tv', year: 2012, director: '科林·德克斯', actors: ['肖恩·埃文斯', '罗杰·阿拉姆'], genre: ['悬疑', '犯罪'], region: '英国', description: '1960 年代牛津，年轻警探摩斯的初出茅庐时代。古典英伦推理的精致之作。', rating: 9.0, poster_primary: '1a1a14', poster_secondary: '4a4a3a' },
  { title: '千次晚安', original_title: 'A Thousand Times Good Night', type: 'movie', year: 2013, director: '埃里克·普派', actors: ['朱丽叶·比诺什'], genre: ['剧情'], region: '挪威', description: '战地女摄影师蕾贝嘉在阿富汗受伤归来，陷入家庭与职业的撕扯。', rating: 7.8, poster_primary: '2a1a14', poster_secondary: '5a3a3a' },
  { title: '大空头', original_title: 'The Big Short', type: 'movie', year: 2015, director: '亚当·麦凯', actors: ['克里斯蒂安·贝尔', '布拉德·皮特'], genre: ['剧情', '喜剧'], region: '美国', description: '2008 年金融危机前，几个华尔街怪咖发现房地产泡沫，做空次贷市场。', rating: 8.5, poster_primary: '0a1414', poster_secondary: '3a3a6a' },
];

async function run() {
  console.log('开始 seed ...');
  // 查重：按 title
  const titles = SEEDS.map((s) => s.title);
  const { data: existing } = await supabase.from('media_items').select('id, title, type').in('title', titles);
  const existingSet = new Set((existing ?? []).map((e) => `${e.title}__${e.type}`));
  const toInsert = SEEDS.filter((s) => !existingSet.has(`${s.title}__${s.type}`)).map((s) => ({
    title: s.title,
    original_title: s.original_title ?? null,
    type: s.type,
    year: s.year,
    director: s.director ?? null,
    actors: s.actors ?? null,
    genre: s.genre ?? null,
    region: s.region ?? null,
    description: s.description,
    rating: s.rating,
    poster_url: `gradient:${s.poster_primary}/${s.poster_secondary}`,
  }));
  if (toInsert.length === 0) {
    console.log('已存在，无需插入');
    return;
  }
  const { data, error } = await supabase.from('media_items').insert(toInsert).select('id, title');
  if (error) {
    console.error('插入失败:', error);
    process.exit(1);
  }
  console.log(`成功插入 ${data?.length ?? 0} 部影视`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
