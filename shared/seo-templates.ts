/**
 * テンプレートのSEOメタデータ
 * Worker SSR / クライアントページ双方で使用
 */

export interface TemplateSEO {
  /** URL slug (ASCII) */
  slug: string;
  /** TEMPLATES配列のインデックス */
  templateIndex: number;
  /**
   * ページ <title>。ブランド名は付けない（SERP の表示幅は全角30字前後で、
   * 付けると差別化語のほうが末尾で切れる）。サイト名は og:site_name が伝える。
   * 「当番表」と場面語（保育園・小学校など）を含めて複合クエリの受け皿にする。
   */
  title: string;
  /** meta description (120-160文字) */
  description: string;
  /** h1 見出し */
  heading: string;
  /** 紹介文 */
  intro: string;
  /** カテゴリID */
  categoryId: string;
}

export interface TemplateCategory {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: "office",
    label: "事務室・オフィス",
    emoji: "🏢",
    description: "オフィスの掃除当番や電話・来客対応など、事務室の日常業務をローテーション管理。",
  },
  {
    id: "kindergarten",
    label: "幼稚園・保育園",
    emoji: "🌷",
    description: "園内おそうじ・バス添乗・預かり保育など、幼稚園・保育園の先生向け当番表テンプレート。",
  },
  {
    id: "school",
    label: "小中学校（クラス用）",
    emoji: "🏫",
    description: "教室そうじ・給食当番・日直など、クラスで使える当番表テンプレート。班やペアで回せます。",
  },
  {
    id: "faculty",
    label: "職員室（先生用）",
    emoji: "🔑",
    description: "校内巡回・施錠など、先生どうしで分担する校務の当番表。",
  },
  {
    id: "pta",
    label: "PTA・保護者会",
    emoji: "🚩",
    description: "旗振り・PTA行事・プール監視など、保護者のローテーション管理に便利なテンプレート。",
  },
  {
    id: "care",
    label: "介護施設",
    emoji: "🏥",
    description: "フロア担当・入浴介助・夜勤など、介護施設のシフト・当番管理テンプレート。",
  },
  {
    id: "community",
    label: "自治会・マンション",
    emoji: "🏘️",
    description: "町内会の清掃・パトロールやマンション共用部の管理当番テンプレート。",
  },
  {
    id: "restaurant",
    label: "飲食店・店舗",
    emoji: "🍴",
    description: "開店・閉店作業やトイレ清掃など、飲食店・店舗のタスクローテーション。",
  },
  {
    id: "home",
    label: "家庭・暮らし",
    emoji: "🏠",
    description: "お風呂掃除・ゴミ出しなどの家事を家族で公平にローテーション。",
  },
  {
    id: "other",
    label: "その他の団体",
    emoji: "🤝",
    description: "シェアハウス・部活動・宗教施設など、さまざまな団体向けテンプレート。",
  },
  {
    id: "checklist",
    label: "チェックリスト・TODO",
    emoji: "✅",
    description: "イベント準備や新学期の準備など、やることリストとしても使えるテンプレート。",
  },
];

export const TEMPLATE_SEO_DATA: TemplateSEO[] = [
  // ── 事務室・オフィス ──
  {
    slug: "office-cleaning",
    templateIndex: 0,
    title: "オフィス・事務室の掃除当番表テンプレート｜無料で印刷",
    description: "事務室・オフィスの掃除当番表を無料で作成。掃除機・モップ、トイレ、ゴミ回収、給湯室など場所ごとのローテーションがすぐ完成します。登録不要。",
    heading: "事務室の掃除当番表テンプレート",
    intro: "オフィスの掃除をメンバーで公平に分担するための当番表です。掃除機・モップ、トイレ・洗面台、ゴミ回収、給湯室の4エリアに分けて管理できます。人数やエリアは自由に編集でき、日付自動ローテーション機能で手間なく運用できます。",
    categoryId: "office",
  },
  {
    slug: "office-phone",
    templateIndex: 1,
    title: "オフィスの電話・来客当番表テンプレート｜受付の分担",
    description: "オフィスの電話・来客対応当番表を無料で作成。午前・午後の対応や郵便物の仕分けなど、受付業務のローテーションを簡単に管理。",
    heading: "電話・来客当番表テンプレート",
    intro: "午前の電話・来客対応、午後の電話・来客対応、郵便物の仕分け・配布の3つの役割で受付業務をローテーション。少人数のオフィスでも公平に分担できます。",
    categoryId: "office",
  },
  // ── 幼稚園・保育園 ──
  {
    slug: "kindergarten-cleaning",
    templateIndex: 2,
    title: "園内おそうじ当番表テンプレート｜幼稚園・保育園向け",
    description: "幼稚園・保育園の園内清掃当番表を無料で作成。保育室・トイレ・園庭・玄関のそうじ分担をクラスごとにローテーション管理。",
    heading: "園内おそうじ当番表テンプレート",
    intro: "保育室の掃除・消毒、トイレ掃除、園庭・遊具の点検、玄関・廊下の清掃をクラス単位でローテーション。さくら組・ひまわり組のようにクラス名で管理できます。",
    categoryId: "kindergarten",
  },
  {
    slug: "bus-escort",
    templateIndex: 3,
    title: "バス添乗・お迎え当番表テンプレート｜幼稚園・保育園向け",
    description: "園バスの添乗当番表を無料で作成。朝・帰りのバス添乗やお迎え対応のローテーションを先生ごとに管理できます。",
    heading: "バス添乗・お迎え当番表テンプレート",
    intro: "朝のバス添乗・乗車人数確認、帰りのバス添乗・降車確認、お迎え対応・門番の3つのシフトで先生の負担を均等に。人数確認チェックリストとしても使えます。",
    categoryId: "kindergarten",
  },
  {
    slug: "after-care",
    templateIndex: 4,
    title: "保育園の預かり保育当番表テンプレート｜早朝・延長保育",
    description: "預かり保育の当番表を無料で作成。早朝保育・延長保育・おやつ準備のローテーションを先生ごとに簡単管理。",
    heading: "預かり保育当番表テンプレート",
    intro: "早朝保育（7:30〜）、延長保育（〜18:00）、おやつ準備・片付けの3シフトで預かり保育を担当。土日祝のスキップ機能で平日だけの自動ローテーションも可能です。",
    categoryId: "kindergarten",
  },
  {
    slug: "nap-check",
    templateIndex: 5,
    title: "午睡チェック当番表テンプレート｜保育園のブレスチェック管理",
    description: "午睡チェック（ブレスチェック・体位確認）の当番表を無料で作成。保育園のSIDS対策に、担当者ローテーションを管理。",
    heading: "午睡チェック当番表テンプレート",
    intro: "0歳・1歳・2歳児クラスごとにブレスチェック・体位確認の担当をローテーション。室温・湿度記録の担当もあわせて管理。タスク割り当てモードで各クラスに必要な人員を柔軟に配置できます。",
    categoryId: "kindergarten",
  },
  {
    slug: "allergy-check",
    templateIndex: 6,
    title: "保育園のアレルギー対応当番表テンプレート｜給食の確認",
    description: "アレルギー対応確認の当番表を無料で作成。除去食チェック・配膳ダブルチェック・喫食時見守りのローテーションを管理。",
    heading: "アレルギー対応確認当番表テンプレート",
    intro: "給食の除去食チェック・配膳ダブルチェック・喫食時見守り、おやつの内容確認・配膳チェックをタスク単位で担当者にローテーション。ヒューマンエラーを防ぐ仕組みづくりに。",
    categoryId: "kindergarten",
  },
  // ── 小中学校（クラス用） ──
  {
    slug: "classroom-cleaning",
    templateIndex: 7,
    title: "教室そうじ当番表テンプレート｜小学校・中学校クラス向け",
    description: "教室のそうじ当番表を無料で作成。ほうき・ぞうきん・ろうか・トイレ・黒板の5エリアを班ごとにローテーション。印刷して教室に掲示できます。",
    heading: "教室そうじ当番表テンプレート",
    intro: "教室（ほうき・ちりとり）、教室（ぞうきんがけ）、ろうか・階段、トイレそうじ、黒板・黒板消しクリーナーの5つの担当を班ごとにローテーション。印刷して教室の壁に貼れば、子どもたちが自分で確認できます。",
    categoryId: "school",
  },
  {
    slug: "school-lunch",
    templateIndex: 8,
    title: "給食当番表テンプレート｜小学校の配膳ローテーション",
    description: "給食当番表を無料で作成。おかず・汁物・ごはんの配膳、牛乳配り、片付け・台拭きを班ごとにローテーション管理。",
    heading: "給食当番表テンプレート",
    intro: "配膳（おかず）、配膳（汁物・ごはん）、牛乳・ストロー配り、片付け・台拭きの4グループで給食の準備から後片付けまでをカバー。印刷して給食コーナーに掲示すれば毎日スムーズです。",
    categoryId: "school",
  },
  {
    slug: "daily-duty",
    templateIndex: 9,
    title: "小学校の日直表・当番表テンプレート｜朝の会・帰りの会",
    description: "日直当番表を無料で作成。朝の会・帰りの会の司会、黒板消し・日誌記入、号令・あいさつをペアでローテーション。",
    heading: "日直表テンプレート",
    intro: "朝の会と帰りの会の司会、黒板消し・日誌記入、号令・あいさつの3役をペアでローテーション。日付自動モードを使えば、平日だけ自動で順番が回ります。",
    categoryId: "school",
  },
  {
    slug: "handout-duty",
    templateIndex: 10,
    title: "配布物・プリント当番表テンプレート｜小学校のクラス係",
    description: "プリント配り・提出物の回収・連絡帳配りなどの係当番表を無料で作成。班ごとのローテーションで公平に分担。",
    heading: "配布物・プリント係表テンプレート",
    intro: "プリント配り、提出物の回収・チェック、連絡帳配り、欠席者分のプリント保管の4つの役割を班ごとにローテーション。学級運営の定番タスクを見える化できます。",
    categoryId: "school",
  },
  {
    slug: "plant-animal-care",
    templateIndex: 11,
    title: "水やり・生き物係の当番表テンプレート｜小学校の飼育栽培",
    description: "水やり・生き物係の当番表を無料で作成。花壇の水やり、メダカのえさやり、水槽掃除、観察日記をローテーション管理。",
    heading: "水やり・生き物係表テンプレート",
    intro: "花壇・プランターの水やり、メダカ・生き物のえさやり、水槽・飼育ケースの掃除、観察日記の記録をタスク単位で班にローテーション。生き物や植物の世話を忘れない仕組みづくりに。",
    categoryId: "school",
  },
  {
    slug: "ventilation-duty",
    templateIndex: 12,
    title: "教室の換気当番表テンプレート｜小中学校の感染症対策",
    description: "教室の換気・環境管理当番表を無料で作成。朝の窓開け、休み時間の換気確認、帰りの戸締りを班ごとにローテーション。",
    heading: "換気・教室環境当番表テンプレート",
    intro: "朝の窓開け・換気、休み時間の換気確認、帰りの戸締り・窓閉め、加湿器の水入れ・管理の4つの役割を班で分担。感染症対策の換気習慣を子どもたち自身で運用できます。",
    categoryId: "school",
  },
  // ── 職員室（先生用） ──
  {
    slug: "school-patrol",
    templateIndex: 13,
    title: "学校の校内巡回・施錠当番表テンプレート｜先生の校務",
    description: "校内巡回・施錠当番表を無料で作成。朝の校門立ち当番、昼休み巡回、放課後の施錠を先生どうしでローテーション管理。",
    heading: "校内巡回・施錠当番表テンプレート",
    intro: "朝の校門立ち当番、昼休み巡回、放課後の施錠・戸締りの3シフトを先生でローテーション。日付自動モードを使えば担当日が自動で決まり、職員室に掲示して共有できます。",
    categoryId: "faculty",
  },
  // ── PTA・保護者会 ──
  {
    slug: "crossing-guard",
    templateIndex: 14,
    title: "旗振り当番表テンプレート｜小学校PTAの登下校見守り",
    description: "旗振り（登下校見守り）当番表を無料で作成。東門・西門・交差点など場所ごとの当番をPTA保護者でローテーション管理。",
    heading: "旗振り（登下校見守り）当番表テンプレート",
    intro: "東門・西門・交差点の旗振りと横断サポートを保護者でローテーション。日付自動ローテーションと土日祝スキップ機能で、登校日だけの当番表が自動的に作れます。印刷して配布やLINEで共有も簡単。",
    categoryId: "pta",
  },
  {
    slug: "pta-event",
    templateIndex: 15,
    title: "PTA行事準備の当番表テンプレート｜設営・受付・片付け",
    description: "PTA行事の準備当番表を無料で作成。設営・受付・片付けの3チームをPTAメンバーでローテーション管理。登録不要。",
    heading: "PTA行事準備当番表テンプレート",
    intro: "机・椅子の搬入から受付・来場者案内、ゴミ回収・撤収まで3チームでPTA行事の運営を分担。行事ごとにローテーションを回せば、特定の保護者に負担が偏りません。",
    categoryId: "pta",
  },
  {
    slug: "pool-watch",
    templateIndex: 16,
    title: "プール監視当番表テンプレート｜小学校PTAの夏休み当番",
    description: "プール監視当番表を無料で作成。プールサイド監視・入水人数チェック・救護係を保護者でローテーション管理。",
    heading: "プール監視当番表テンプレート",
    intro: "午前・午後のプールサイド監視と入水人数チェック、救護・AED準備・水温記録の3シフトで安全なプール開放を実現。夏休み期間の保護者当番を公平に割り振れます。",
    categoryId: "pta",
  },
  {
    slug: "reading-volunteer",
    templateIndex: 17,
    title: "読み聞かせ当番表テンプレート｜小学校ボランティアの学年別",
    description: "読み聞かせボランティアの当番表を無料で作成。1〜6年生の教室ごとにボランティアをローテーション管理。",
    heading: "読み聞かせボランティア当番表テンプレート",
    intro: "1年生から6年生まで各教室の読み聞かせ担当をボランティアでローテーション。6学年×ボランティア6名のテンプレートで、全学年をまんべんなく回れます。",
    categoryId: "pta",
  },
  // ── 介護施設 ──
  {
    slug: "care-floor",
    templateIndex: 18,
    title: "介護施設のフロア担当当番表テンプレート｜日勤シフト表",
    description: "介護施設のフロア担当表を無料で作成。日勤リーダー・サブを3フロアでローテーション管理。タスク割り当てモード対応。",
    heading: "フロア担当表テンプレート",
    intro: "3フロアの日勤リーダー・日勤サブをスタッフ間でローテーション。タスク割り当てモードで各フロアに必要な人員を柔軟に配置でき、日付自動ローテーションで毎日のシフトが自動で決まります。",
    categoryId: "care",
  },
  {
    slug: "bathing-assist",
    templateIndex: 19,
    title: "介護施設の入浴介助当番表テンプレート｜午前・午後の分担",
    description: "入浴介助の当番表を無料で作成。浴室内介助・脱衣着衣介助・誘導見守りを午前午後でローテーション管理。",
    heading: "入浴介助当番表テンプレート",
    intro: "午前・午後の2シフトで浴室内介助、脱衣・着衣介助、誘導・見守りの3つのタスクを5名のスタッフでローテーション。入浴介助の偏りを防ぎ、スタッフの負担を均等化します。",
    categoryId: "care",
  },
  {
    slug: "night-shift",
    templateIndex: 20,
    title: "夜勤当番表テンプレート｜介護施設の夜間ローテーション",
    description: "介護施設の夜勤当番表を無料で作成。巡回・ナースコール対応・起床介助をスタッフでローテーション管理。",
    heading: "夜勤当番表テンプレート",
    intro: "夜間巡回（2時間おき）・ナースコール対応・記録、起床介助・朝食準備補助の2シフトを5名でローテーション。印刷して夜勤ステーションに掲示すれば、担当が一目でわかります。",
    categoryId: "care",
  },
  // ── 自治会・マンション ──
  {
    slug: "community-cleaning",
    templateIndex: 21,
    title: "町内会・自治会の清掃当番表テンプレート｜地区の分担表",
    description: "町内会の清掃・管理当番表を無料で作成。ゴミ集積所清掃、公園清掃、夜間パトロールを班ごとにローテーション。",
    heading: "町内会 清掃・管理当番表テンプレート",
    intro: "ゴミ集積所清掃・不法投棄チェック、公園清掃・遊具点検、夜間パトロール・街灯確認の3つの役割を東町・西町など地区班でローテーション。回覧板代わりに印刷して配布できます。",
    categoryId: "community",
  },
  {
    slug: "apartment-management",
    templateIndex: 22,
    title: "マンション共用部の管理当番表テンプレート｜管理組合の分担",
    description: "マンション共用部の管理当番表を無料で作成。エントランス・ゴミ置き場・廊下・植栽の管理を階ごとにローテーション。",
    heading: "マンション共用部管理当番表テンプレート",
    intro: "エントランス清掃、ゴミ置き場清掃・分別チェック、共用廊下見回り・駐輪場整理、植栽水やり・除草の4つの作業を階ごとにローテーション。管理組合の定例当番を見える化できます。",
    categoryId: "community",
  },
  // ── 飲食店・店舗 ──
  {
    slug: "restaurant-ops",
    templateIndex: 23,
    title: "飲食店の開店・閉店当番表テンプレート｜店舗スタッフの分担",
    description: "飲食店の開店・閉店作業当番表を無料で作成。仕込み・配膳・レジ開け・清掃・戸締りをスタッフでローテーション管理。",
    heading: "飲食店 開店・閉店作業表テンプレート",
    intro: "開店作業（仕込み・テーブルセット・看板出し・レジ開け）、閉店作業（清掃・戸締り・レジ締め・売上報告）、日中清掃（トイレ・備品補充）の3カテゴリをスタッフ6名でローテーション。",
    categoryId: "restaurant",
  },
  // ── 家庭・暮らし ──
  {
    slug: "household-chores",
    templateIndex: 24,
    title: "家事当番表テンプレート｜家族で分担するローテーション表",
    description: "家事ローテーション表を無料で作成。お風呂掃除・ゴミ出しなどの家事を家族で公平にローテーション。登録不要。",
    heading: "家事ローテーション表テンプレート",
    intro: "お風呂掃除やゴミ出しなど、日常の家事を家族メンバーで公平にローテーション。タスクやメンバーは自由に追加・編集でき、冷蔵庫に貼れるきれいな当番表が印刷できます。",
    categoryId: "home",
  },
  {
    slug: "sharehouse-management",
    templateIndex: 25,
    title: "シェアハウスの掃除当番表テンプレート｜共用部の分担表",
    description: "シェアハウスの共用部管理当番表を無料で作成。キッチン・浴室・ゴミ出し・リビングの清掃をルームメイトでローテーション。",
    heading: "シェアハウス共用部管理表テンプレート",
    intro: "キッチン清掃、浴室・洗面台清掃、ゴミ出し・分別、リビング・玄関・トイレの4エリアを5人のルームメイトでローテーション。URLで共有すれば全員がスマホで確認できます。",
    categoryId: "home",
  },
  // ── その他の団体 ──
  {
    slug: "sports-club",
    templateIndex: 26,
    title: "部活動・スポーツチームの当番表テンプレート｜グラウンド整備",
    description: "部活動の当番表を無料で作成。グラウンド整備・用具準備・ドリンク・部室清掃を学年班でローテーション管理。",
    heading: "スポーツチーム・部活動当番表テンプレート",
    intro: "グラウンド整備・ライン引き、用具準備・片付け、ドリンク準備・補充、部室清掃・出欠記録の4カテゴリを学年班でローテーション。練習前後の準備・片付けを公平に分担できます。",
    categoryId: "other",
  },
  {
    slug: "religious-service",
    templateIndex: 27,
    title: "教会・寺院の奉仕当番表テンプレート｜清掃・受付の分担",
    description: "教会・寺院の奉仕当番表を無料で作成。清掃・受付・献花・法要準備を組ごとにローテーション管理。登録不要。",
    heading: "教会・寺院 奉仕当番表テンプレート",
    intro: "本堂・礼拝堂の清掃、受付・参拝者案内、献花・供花の手入れ、法要・行事準備の4つの奉仕を梅組・松組・竹組・桜組でローテーション。檀家や信徒の奉仕活動を公平に管理できます。",
    categoryId: "other",
  },
  // ── チェックリスト・TODO ──
  {
    slug: "event-checklist",
    templateIndex: 28,
    title: "イベント準備チェックリストテンプレート｜無料で作成・印刷",
    description: "イベント準備のチェックリストを無料で作成。会場予約・備品準備・告知・当日運営・撤収をチームで分担管理。登録不要。",
    heading: "イベント準備チェックリストテンプレート",
    intro: "会場の予約・下見、備品・機材の準備、告知・案内状の作成、当日の受付・誘導、撤収・片付けの5つのタスクをチームで分担。tobanをやることリストとしても活用できます。",
    categoryId: "checklist",
  },
  {
    slug: "new-semester-checklist",
    templateIndex: 29,
    title: "新学期やることリストテンプレート｜先生の準備チェックリスト",
    description: "新学期の準備チェックリストを無料で作成。名簿作成・教室準備・配布物・保護者連絡など、やることを担当者で分担管理。",
    heading: "新学期やることリストテンプレート",
    intro: "名簿・座席表の作成、教室の掲示・レイアウト、配布物の印刷、保護者連絡、当番表・係決め準備の5つのタスクを担任・副担任・学年主任で分担。新学期の準備漏れを防ぎます。",
    categoryId: "checklist",
  },
  {
    slug: "moving-checklist",
    templateIndex: 30,
    title: "引っ越しやることリストテンプレート｜手続き・荷造りの準備",
    description: "引っ越しのやることリストを無料で作成。転出届・ライフライン手続き・荷造り・新居準備・退去作業を家族で分担管理。",
    heading: "引っ越しやることリストテンプレート",
    intro: "転出届・転入届やライフライン手続き、荷造り・不用品処分、新居の掃除・家具配置、旧居の掃除・退去立ち会いの4カテゴリで引っ越しタスクを管理。家族やパートナーとの分担にも便利です。",
    categoryId: "checklist",
  },
];

/** slug → TemplateSEO の高速検索マップ */
export const TEMPLATE_SEO_MAP = new Map(
  TEMPLATE_SEO_DATA.map((t) => [t.slug, t]),
);


/** 共通FAQ（全テンプレートページに表示） */
// 先頭 4 問は用途・作り方の質問。生成AI検索は見出しを質問、直下を答えとして引用するため、
// 各回答は前後の文脈なしで単独で意味が通る形にしてある。件数などの可変値は書かない（陳腐化するため）。
export const COMMON_FAQ = [
  {
    question: "当番表はどうやって作りますか？",
    answer: "テンプレートを選んでメンバーの名前を入れるだけで完成します。担当の数や人数、並び順は後から自由に編集できます。アカウント登録もインストールも不要で、ブラウザだけで作れます。作った表はそのまま印刷やPDF保存ができます。",
  },
  {
    question: "どんな場面で使えますか？",
    answer: "学校の掃除・給食当番、保育園の午睡チェックやバス添乗、介護施設のフロア担当や夜勤、町内会の清掃、マンション共用部の管理、飲食店の開店・閉店作業、オフィスの電話・来客当番、家庭の家事分担など、用途別のテンプレートを用意しています。",
  },
  {
    question: "当番の順番はどう決めると公平ですか？",
    answer: "全員が同じ回数だけそれぞれの担当を経験するよう、順番をひとつずつずらしていくローテーション方式が公平です。tobanはこのずらしを自動で行うため、誰がどの担当を何回やったかを数える必要がありません。最初の並び順に迷うときは、ルーレットでランダムに決められます。",
  },
  {
    question: "何人まで登録できますか？",
    answer: "メンバーは1人から50人まで、担当は20個まで登録できます。担当の数とメンバーの人数は別々に設定できるため、3つの担当を5人で回すような、人数と担当数が一致しない構成にも対応しています。",
  },
  {
    question: "tobanは無料ですか？",
    answer: "はい、完全無料でお使いいただけます。アカウント登録も不要で、ブラウザだけですぐに当番表を作成できます。",
  },
  {
    question: "作った当番表は印刷できますか？",
    answer: "はい、ブラウザの印刷機能を使って、きれいなレイアウトで印刷や画像保存ができます。印刷ダイアログからPDF保存も可能です。カード表示・一覧表・カレンダー・円盤の4つの形式から選べます。",
  },
  {
    question: "当番表を他の人と共有するにはどうすればいいですか？",
    answer: "共有ボタンからURLを発行できます。閲覧用URLを送れば誰でも当番表を確認でき、編集用URLを渡せば共同で編集することもできます。QRコードでの共有にも対応しています。",
  },
  {
    question: "ローテーションは自動で切り替わりますか？",
    answer: "日付モードを設定すれば、開始日と周期に基づいて自動的にローテーションが切り替わります。土日や祝日をスキップする設定もあります。",
  },
  {
    question: "推奨ブラウザはありますか？",
    answer: "Google Chrome または Microsoft Edge の最新版を推奨しています。印刷レイアウトが最もきれいに出力されます。Safari や Firefox でも基本機能は動作しますが、印刷時のレイアウトが崩れる場合があります。",
  },
  {
    question: "スマートフォンでも使えますか？",
    answer: "はい、当番表の作成・閲覧・共有はスマートフォンでも問題なくお使いいただけます。印刷やPDF保存をする場合は、パソコンの Google Chrome からの操作を推奨します。",
  },
  {
    question: "データはどこに保存されますか？",
    answer: "当番表のデータはお使いのブラウザ内（localStorage）に保存されます。共有機能を使った場合のみ、クラウドサーバーにも保存されます。ブラウザのデータを削除すると当番表も消えるため、大切なデータは共有URLを発行して保管することをおすすめします。",
  },
  {
    question: "お問い合わせはどこからできますか？",
    answer: "tobanのトップページ下部にあるお問い合わせフォームからご連絡いただけます。不具合の報告や機能のご要望など、お気軽にお送りください。",
  },
];

// ───────────────────────────────────────────────────────────
// 英語訳（client の locale=en 表示用）。
// 既存の JA 配列は無改変。server の bot prerender は JA のまま使う。
// 欠落時は client 側で JA に fallback する。
// ───────────────────────────────────────────────────────────

/** カテゴリの英語訳（id キー） */
export const TEMPLATE_CATEGORIES_EN: Record<string, { label: string; description: string }> = {
  office: { label: "Office", description: "Rotate everyday office tasks such as cleaning duty and phone/reception coverage." },
  kindergarten: { label: "Kindergarten & Preschool", description: "Templates for preschool teachers—facility cleaning, bus escort, extended care, and more." },
  school: { label: "Elementary & Junior High (Class)", description: "Classroom duty templates—cleaning, school lunch, daily duty. Works by group or pair." },
  faculty: { label: "Staff Room (Teachers)", description: "Rosters for school tasks teachers share, like patrols and locking up." },
  pta: { label: "PTA & Parents", description: "Handy templates for parent rotations—crossing guard, PTA events, pool watch." },
  care: { label: "Care Facility", description: "Shift and duty management for care facilities—floor assignments, bathing assistance, night shifts." },
  community: { label: "Neighborhood & Apartment", description: "Templates for neighborhood cleaning/patrol and apartment common-area management." },
  restaurant: { label: "Restaurant & Shop", description: "Task rotations for restaurants and shops—opening/closing work, restroom cleaning." },
  home: { label: "Home & Living", description: "Rotate household chores like bath cleaning and taking out the trash fairly among family." },
  other: { label: "Other Groups", description: "Templates for various groups—share houses, clubs, places of worship." },
  checklist: { label: "Checklist & TODO", description: "Templates usable as to-do lists, like event prep and new-term preparation." },
};

/** テンプレートの heading / intro の英語訳（slug キー） */
export const TEMPLATE_SEO_EN: Record<string, { heading: string; intro: string }> = {
  "office-cleaning": { heading: "Office Cleaning Duty Roster Template", intro: "A roster for sharing office cleaning fairly among members. Manage four areas: vacuuming/mopping, restroom & sink, trash collection, and the kitchenette. People and areas are fully editable, and automatic date rotation keeps it running hands-free." },
  "office-phone": { heading: "Phone & Reception Duty Roster Template", intro: "Rotate reception duties across three roles: morning phone/visitor handling, afternoon phone/visitor handling, and mail sorting/distribution. Even a small office can share the load fairly." },
  "kindergarten-cleaning": { heading: "Preschool Cleaning Duty Roster Template", intro: "Rotate cleaning by class: room cleaning/disinfection, restroom cleaning, playground/equipment checks, and entrance/hallway cleaning. Manage by class name, like Sakura or Himawari." },
  "bus-escort": { heading: "Bus Escort & Pickup Duty Roster Template", intro: "Balance teachers' load across three shifts: morning bus escort/headcount, afternoon bus escort/drop-off check, and pickup/gate duty. Also works as a headcount checklist." },
  "after-care": { heading: "Extended Care Duty Roster Template", intro: "Cover extended care with three shifts: early care (from 7:30), extended care (until 18:00), and snack prep/cleanup. The weekend/holiday skip feature enables weekday-only automatic rotation." },
  "nap-check": { heading: "Nap Check Duty Roster Template", intro: "Rotate breathing and position checks for the 0-, 1-, and 2-year-old classes, plus temperature/humidity logging. Task-assignment mode lets you staff each class flexibly for SIDS prevention." },
  "allergy-check": { heading: "Allergy Check Duty Roster Template", intro: "Rotate, by task, the allergen-free meal check, double-check at serving, and watch during eating, plus snack content and serving checks. Builds a system to prevent human error." },
  "classroom-cleaning": { heading: "Classroom Cleaning Duty Roster Template", intro: "Rotate five jobs by group: classroom (broom/dustpan), classroom (wiping), hallway/stairs, restroom cleaning, and blackboard/eraser cleaner. Print it and post it on the wall so kids can check it themselves." },
  "school-lunch": { heading: "School Lunch Duty Roster Template", intro: "Cover prep to cleanup with four groups: serving (main dish), serving (soup/rice), milk/straw handout, and cleanup/wiping. Print it and post it at the lunch corner for smooth days." },
  "daily-duty": { heading: "Daily Duty (Nicchoku) Roster Template", intro: "Rotate three roles in pairs: hosting the morning and afternoon meetings, erasing the board/filling the journal, and calls/greetings. With date auto mode, the order rotates automatically on weekdays only." },
  "handout-duty": { heading: "Handout & Print Helper Roster Template", intro: "Rotate four roles by group: handing out prints, collecting/checking submissions, distributing communication notebooks, and keeping prints for absentees. Makes the classic class-management tasks visible." },
  "plant-animal-care": { heading: "Watering & Animal Care Roster Template", intro: "Rotate, by task, watering beds/planters, feeding fish/animals, cleaning tanks/cages, and keeping the observation journal. Builds a habit so plants and animals are never forgotten." },
  "ventilation-duty": { heading: "Ventilation & Classroom Environment Roster Template", intro: "Share four roles by group: morning window opening, ventilation checks at breaks, locking up/closing windows at day's end, and refilling/managing the humidifier. Kids can run the ventilation habit themselves." },
  "school-patrol": { heading: "Campus Patrol & Locking Roster Template", intro: "Rotate three shifts among teachers: morning gate duty, lunchtime patrol, and after-school locking up. With date auto mode the duty day is set automatically, and you can post it in the staff room." },
  "crossing-guard": { heading: "Crossing Guard (Flag) Duty Roster Template", intro: "Rotate flag duty and crossing support at the east gate, west gate, and intersection among parents. With automatic date rotation and weekend/holiday skip, a school-days-only roster builds itself. Easy to print or share via LINE." },
  "pta-event": { heading: "PTA Event Prep Roster Template", intro: "Share PTA event operations across three teams—from moving desks and chairs, to reception and guiding guests, to trash collection and teardown. Rotating per event keeps the load off specific parents." },
  "pool-watch": { heading: "Pool Watch Duty Roster Template", intro: "Run a safe pool opening with poolside watch and headcount checks (morning and afternoon) plus a first-aid/AED-prep/water-temperature shift. Share summer-break parent duties fairly." },
  "reading-volunteer": { heading: "Read-Aloud Volunteer Roster Template", intro: "Rotate read-aloud volunteers across classrooms from grade 1 to 6. With a template of 6 grades by 6 volunteers, you can cover every grade evenly." },
  "care-floor": { heading: "Floor Assignment Roster Template", intro: "Rotate day-shift leaders and sub-leaders across three floors among staff. Task-assignment mode lets you staff each floor flexibly, and automatic date rotation sets each day's shift." },
  "bathing-assist": { heading: "Bathing Assistance Roster Template", intro: "Rotate three tasks—in-bath assistance, undressing/dressing assistance, and guiding/watching—across morning and afternoon shifts among 5 staff. Prevents uneven bathing-assistance loads." },
  "night-shift": { heading: "Night Shift Roster Template", intro: "Rotate two shifts among 5 staff: night patrols (every 2 hours)/nurse-call response/records, and wake-up assistance/breakfast-prep support. Print and post it at the night station so the assignee is clear at a glance." },
  "community-cleaning": { heading: "Neighborhood Cleaning & Management Roster Template", intro: "Rotate three roles among district groups (e.g., East Town, West Town): trash-station cleaning/dumping checks, park cleaning/equipment inspection, and night patrol/streetlight checks. Print and distribute it in place of a circular notice." },
  "apartment-management": { heading: "Apartment Common-Area Management Roster Template", intro: "Rotate four tasks by floor: entrance cleaning, trash-area cleaning/sorting checks, hallway rounds/bike-parking tidying, and plant watering/weeding. Makes the management association's routine duties visible." },
  "restaurant-ops": { heading: "Restaurant Opening & Closing Roster Template", intro: "Rotate three categories among 6 staff: opening work (prep, table setting, sign, register), closing work (cleaning, locking up, closing the register, sales report), and daytime cleaning (restroom, restocking)." },
  "household-chores": { heading: "Household Chore Rotation Template", intro: "Rotate everyday chores like bath cleaning and taking out the trash fairly among family members. Tasks and members are freely editable, and you can print a clean roster to stick on the fridge." },
  "sharehouse-management": { heading: "Share House Common-Area Roster Template", intro: "Rotate four areas among 5 roommates: kitchen cleaning, bathroom/sink cleaning, trash/sorting, and the living room/entrance/restroom. Share by URL so everyone can check it on their phone." },
  "sports-club": { heading: "Sports Team & Club Duty Roster Template", intro: "Rotate four categories among grade groups: ground prep/line marking, equipment setup/cleanup, drink prep/refill, and clubroom cleaning/attendance records. Share pre- and post-practice work fairly." },
  "religious-service": { heading: "Church & Temple Service Roster Template", intro: "Rotate four services among groups (Ume, Matsu, Take, Sakura): cleaning the main hall/chapel, reception/visitor guidance, flower offering/arranging, and memorial/event prep. Fairly manage the service activities of members." },
  "event-checklist": { heading: "Event Prep Checklist Template", intro: "Share five tasks across the team: venue booking/site visit, supplies/equipment prep, announcements/invitations, day-of reception/guidance, and teardown/cleanup. You can also use toban as a to-do list." },
  "new-semester-checklist": { heading: "New-Term To-Do List Template", intro: "Split five tasks among the homeroom teacher, assistant, and grade head: roster/seating chart, classroom displays/layout, printing handouts, contacting parents, and prepping duty rosters/roles. Prevents new-term oversights." },
  "moving-checklist": { heading: "Moving To-Do List Template", intro: "Manage moving tasks in four categories: move-out/move-in notices and utilities, packing/disposing of unwanted items, cleaning/furniture placement at the new home, and cleaning/walkthrough at the old home. Handy for splitting with family." },
};

/** 共通FAQ の英語訳（COMMON_FAQ と同順） */
export const COMMON_FAQ_EN: { question: string; answer: string }[] = [
  { question: "How do I make a duty roster?", answer: "Pick a template and type in your members' names—that's it. The number of assignments, the number of people, and the order are all editable afterwards. No account and no install required; it works in the browser alone. You can print the finished roster or save it as a PDF." },
  { question: "What can I use it for?", answer: "School cleaning and lunch duties, nursery nap checks and bus escorts, care-home floor assignments and night shifts, neighbourhood clean-ups, shared-area management in apartment buildings, opening and closing tasks at restaurants, office phone and reception duty, and household chores at home—there are templates for each." },
  { question: "How do I decide the order fairly?", answer: "The fairest approach is a rotation that shifts the order by one each time, so everyone takes on each assignment the same number of times. toban shifts it automatically, so you never have to count who did what and how often. If you're unsure about the starting order, you can decide it at random with the wheel." },
  { question: "How many people can I add?", answer: "You can register from 1 to 50 members and up to 20 assignments. The number of assignments and the number of people are set separately, so you can run three assignments among five people—the two counts don't have to match." },
  { question: "Is toban free?", answer: "Yes, it's completely free. No account needed—you can create a roster right in your browser." },
  { question: "Can I print the roster I made?", answer: "Yes. Use your browser's print feature to print or save an image with a clean layout, or save as PDF from the print dialog. Choose from four formats: cards, table, calendar, or wheel." },
  { question: "How do I share a roster with others?", answer: "Issue a URL from the Share button. Send a view-only URL so anyone can see the roster, or share an edit URL to collaborate. QR-code sharing is also supported." },
  { question: "Does the rotation switch automatically?", answer: "If you set date mode, the rotation switches automatically based on a start date and cycle. There's also an option to skip weekends and holidays." },
  { question: "Is there a recommended browser?", answer: "We recommend the latest Google Chrome or Microsoft Edge for the cleanest print layout. Basic features work in Safari and Firefox too, but the print layout may break." },
  { question: "Can I use it on a smartphone?", answer: "Yes, creating, viewing, and sharing rosters all work fine on a smartphone. For printing or saving as PDF, we recommend Google Chrome on a computer." },
  { question: "Where is my data stored?", answer: "Roster data is stored in your browser (localStorage). It's also saved to the cloud only when you use the share feature. Clearing your browser data deletes the roster, so for important data we recommend issuing a share URL to keep it." },
  { question: "Where can I contact you?", answer: "Reach us through the contact form at the bottom of toban's top page. Feel free to send bug reports or feature requests." },
];

/**
 * 「当番の順番をルーレット感覚で決める」専用 SEO ページ (/junban) のメタ。
 * 検索意図「当番 ルーレット / 順番 決める」を、円盤ビューの受け皿として捕捉する。
 * 円盤は固定ローテーションを回す方式でランダム抽選ではないため、コピーは
 * 「順番が回る・一目でわかる」見せ方に限定し、抽選は約束しない（FAQ で明記）。
 */
export interface JunbanPageSEO {
  path: string;
  title: string;
  description: string;
  heading: string;
  intro: string;
  benefits: string[];
  faq: { question: string; answer: string }[];
}

export const JUNBAN_PAGE_SEO: JunbanPageSEO = {
  path: "/junban",
  title: "当番の順番をルーレット感覚で決める｜無料の当番表作成アプリ toban",
  description:
    "当番や係の順番を、回転する円盤でくるくる決められる無料の当番表作成アプリ。名前を入れて回すだけで担当が決まり、印刷して壁に貼ればピンを回して毎週の担当が一目でわかります。登録不要・エクセル不要、ブラウザですぐ作れます。",
  heading: "当番・係の順番をルーレット感覚で決める",
  intro:
    "「次は誰の番？」を毎回数えるのは大変です。tobanの円盤ビューなら、メンバーの名前を入れて回すだけで担当が決まります。掃除・給食・日直から係活動まで、回転する盤面で順番がひと目でわかります。印刷して壁に貼れば、毎週ピンをひとつ進めるだけ。",
  benefits: [
    "名前を入れて回すだけ — 順番決めがそのまま当番表になります",
    "印刷して壁に貼れる — ピンをひとつ回すだけで今週の担当がわかります",
    "登録不要・無料 — ブラウザだけで完結、エクセルもアプリのインストールも不要です",
  ],
  faq: [
    {
      question: "当番の順番をランダム（抽選）で決められますか？",
      answer:
        "円盤ビューは、決めた順番をくるくる回していく方式で、毎回ランダムに当たりを引く抽選とは異なります。並び順は固定のまま公平に順番が回るので、掃除・給食・係などの当番ローテーションに向いています。",
    },
    {
      question: "決めた順番を紙に印刷できますか？",
      answer:
        "はい。円盤はそのまま印刷でき、全体・外円・内円の3枚を出力できます。外円（役割）と内円（担当者）を切り取って中心をピンで留めれば、毎週ピンを回すだけの紙の当番ルーレットになります。",
    },
    {
      question: "人数や当番の数は自由に変えられますか？",
      answer:
        "はい。メンバーや当番（役割）は自由に追加・編集できます。担当者の数が当番の数以上であれば円盤で表示でき、足りない場合はカード・一覧表・カレンダーの表示形式に切り替えてご利用いただけます。",
    },
  ],
};

/** /junban ページの英語訳 */
export const JUNBAN_PAGE_SEO_EN: Pick<JunbanPageSEO, "title" | "description" | "heading" | "intro" | "benefits" | "faq"> = {
  title: "Decide Duty Order Like a Wheel | Free Duty Roster Maker toban",
  description:
    "Spin a rotating wheel to decide the order of chores and duties—free, no sign-up. Enter names and spin to assign, print it for the wall, and turn the pin each week to see who's on duty at a glance.",
  heading: "Decide duty and chore order with a spinning wheel",
  intro:
    "Tired of counting \"whose turn is it next?\" every time? toban's wheel view lets you enter member names and spin to assign duties. From cleaning, lunch, and daily duty to club roles, the rotating board shows the order at a glance. Print it for the wall and just advance the pin each week.",
  benefits: [
    "Enter names and spin — your order becomes the roster",
    "Print it for the wall — turn one pin to see this week's duty",
    "No sign-up, free — browser only, no Excel or app install needed",
  ],
  faq: [
    {
      question: "Can I decide duty order randomly (a lottery)?",
      answer:
        "The wheel view spins a fixed order around—it's not a random lottery that draws a winner each time. The order stays fixed and rotates fairly, which suits duty rotations like cleaning, lunch, and roles.",
    },
    {
      question: "Can I print the order I decided?",
      answer:
        "Yes. The wheel prints as three sheets: full, outer ring, and inner ring. Cut out the outer ring (roles) and inner ring (members), pin them at the center, and you get a paper duty wheel you turn each week.",
    },
    {
      question: "Can I freely change the number of people and duties?",
      answer:
        "Yes. Members and duties (roles) are freely editable. The wheel shows when you have at least as many members as duties; otherwise, switch to the card, table, or calendar view.",
    },
  ],
};
