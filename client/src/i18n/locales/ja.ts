// 日本語辞書。UI の枠（chrome）のみ。テンプレ/メンバー/テーマの中身は対象外。
// キーは namespace.key 形式。文字列抽出の各 step でここに追記していく。

export const ja: Record<string, string> = {
  "lang.switchLabel": "言語",
  "lang.ja": "日本語",
  "lang.en": "English",

  "footer.about": "toban について",

  // 共通
  "common.close": "閉じる",

  // 回転ラベル（共有/Home 共用）
  "rotation.initial": "初期",
  "rotation.nth": "{n}回目",

  // 共有閲覧ページ
  "shared.printUnsupported":
    "このブラウザでは印刷できません。SafariまたはChromeで開いてください",
  "shared.error.notFound": "スケジュールが見つかりませんでした",
  "shared.error.server":
    "サーバーエラーが発生しました。しばらくしてからお試しください",
  "shared.error.fetch": "データの取得に失敗しました",
  "shared.error.network":
    "ネットワークエラーが発生しました。接続を確認してください",
  "shared.copied": "当番表をコピーしました",
  "shared.createYourOwn": "自分で当番表を作る",
  "shared.copyToMine": "この当番表を自分用にコピー",
  "shared.printHeader": "順番: {label} ／ 印刷日: {date}",

  // 共有モーダル
  "share.title": "共有",
  "share.tabView": "👀 見るだけ",
  "share.tabEdit": "✏️ 編集もできる",
  "share.descView":
    "みんなに当番表を見せたいときはこちら。「{name}」を誰でも見ることができます。",
  "share.descEdit":
    "一緒に編集したいときはこちら。「{name}」の編集権限を相手に渡せます。",
  "share.lineShare": "LINEで共有",
  "share.showQr": "QRコードを表示",
  "share.hideQr": "QRコードを隠す",
  "share.copied": "コピーしました",
  "share.copyUrl": "URLをコピー",
  "share.copiedView": "閲覧用URLをコピーしました",
  "share.copiedEdit": "編集用URLをコピーしました",
  "share.copyFailed": "コピーに失敗しました。URLを選択してコピーしてください",
  "share.editWarning":
    "このURLを知っている人は当番表を編集できます。信頼できる相手にのみ共有してください。",
  // 日数は server/worker.ts の CLEANUP_RETENTION_DAYS と揃える
  "share.retention":
    "共有した当番表は、1年間まったく編集がないと自動で削除されます。",

  // ランディングページ
  "lp.docTitle": "当番表作成アプリ toban｜無料で簡単作成・印刷・共有",
  "lp.shareText":
    "かんたん当番表、すぐ完成。掃除・給食・日直のローテーション表を無料で作成できます。",
  "lp.shareTitle": "toban｜かんたん当番表",
  "lp.shareToban": "tobanを共有する",
  "lp.shareMenuClose": "共有メニューを閉じる",
  "lp.shareX": "Xで共有",
  "lp.urlCopied": "URLをコピーしました",
  "lp.copyFailed": "コピーに失敗しました",
  "lp.createSchedule": "当番表を作る",
  "lp.heroTitleA": "かんたん当番表、",
  "lp.heroTitleB": "すぐ完成。",
  "lp.heroSubA": "学校・保育園・介護施設・自治会・オフィス・家庭の当番表を",
  "lp.heroSubB": "無料でかんたんに作成・印刷・共有できます。",
  "lp.featuresHeading": "tobanの特徴",
  "lp.feat.noSignup.label": "登録不要",
  "lp.feat.noSignup.desc":
    "エクセル不要。スマホでもパソコンでも、ブラウザだけで完結します。",
  "lp.feat.print.label": "印刷がきれい",
  "lp.feat.print.desc":
    "カード・一覧表・カレンダー・円盤の4形式で印刷できます。",
  "lp.feat.share.label": "LINEで共有",
  "lp.feat.share.desc": "共有URLを発行してLINEやメールで送れます。",
  "lp.feat.free.label": "完全無料",
  "lp.feat.free.desc": "すべての機能を無料でお使いいただけます。",
  "lp.templatesHeading": "すぐ使えるテンプレート",
  "lp.templatesSubtitle":
    "{count}種類のテンプレートから選んで、メンバーを入れるだけ。",
  "lp.viewAllTemplates": "テンプレート一覧を見る",
  "lp.viewJunban": "順番決め・当番ルーレットで作る",
  "lp.faqHeading": "よくある質問",

  // お問い合わせフォーム
  "contact.heading": "お問い合わせ",
  "contact.subtitle":
    "不具合の報告や機能のご要望など、お気軽にご連絡ください。",
  "contact.categoryLabel": "お問い合わせ種別",
  "contact.selectPlaceholder": "選択してください",
  "contact.emailLabel": "メールアドレス",
  "contact.messageLabel": "お問い合わせ内容",
  "contact.messagePlaceholder":
    "不具合の報告や機能のご要望など、お気軽にお書きください。",
  "contact.sending": "送信中…",
  "contact.submit": "送信する",
  "contact.sent": "送信しました",
  "contact.sentDetail":
    "お問い合わせいただきありがとうございます。内容を確認のうえ、ご返信いたします。",
  "contact.sendAnother": "別の内容を送信する",
  "contact.error": "送信に失敗しました。しばらくしてからお試しください。",

  // 共通アクション
  "common.save": "保存する",
  "common.delete": "削除",
  "common.duplicate": "複製",
  "common.cancel": "キャンセル",

  // 新規作成モーダル（枠のみ。テンプレ一覧は日本語固定）
  "newSchedule.title": "新しい当番表を作成",
  "newSchedule.instruction":
    "テンプレートを選択してください。後から自由に編集できます。",
  "newSchedule.createBlank": "新しくつくる",
  "newSchedule.createBlankDesc": "空白から自由に当番表を作成",

  // 設定モーダル
  "settings.title": "編集",
  "settings.unsaved": "未保存",
  "settings.newTask": "新しいタスク",
  "settings.confirmClose": "変更が保存されていません。閉じますか？",
  "settings.errorNeedTask": "タスクが1つ以上必要です。",
  "settings.errorNeedMember": "担当者が1人以上必要です。",
  "settings.maxMembersReached": "メンバーは最大{n}人までです。",
  "settings.maxGroupsReached": "グループは最大{n}個までです。",
  "settings.maxTasksReached": "タスクは1グループ最大{n}個までです。",
  "settings.rotationManual": "手動で切り替え",
  "settings.rotationDate": "日付で自動",
  "settings.viewByTask": "タスクから見る",
  "settings.viewByMember": "担当者から見る",
  "settings.summaryTaskMode": "{tasks}タスク・{members}人",
  "settings.summaryMemberMode": "{members}人・{groups}グループ",
  "settings.sectionBasic": "基本設定",
  "settings.scheduleName": "当番表の名前",
  "settings.scheduleNamePlaceholder": "例: 掃除当番、給食当番、日直...",
  "settings.pin": "先頭に固定",
  "settings.unpin": "固定を解除",
  "settings.pinTab": "タブを先頭に固定",
  "settings.chooseView": "見方をえらぶ",
  "settings.whoDoesWhat": "だれが何をするか",
  "settings.whatByWhom": "何をだれがやるか",
  "settings.sectionDesign": "テーマ",
  "settings.sectionContent": "内容を編集",

  // グループ/メンバー/タスク編集
  "group.moveGroupUp": "グループを上に移動",
  "group.moveGroupDown": "グループを下に移動",
  "group.moveUp": "上に移動",
  "group.moveDown": "下に移動",
  "group.emojiOf": "グループ{n}の絵文字",
  "group.taskNamePlaceholder": "タスク名を入力",
  "group.taskNameOf": "タスク{n}の名前",
  "group.namePlaceholder": "名前を入力",
  "group.memberNameOf": "担当者{n}の名前",
  "group.memberName": "メンバーの名前",
  "group.details": "詳細設定",
  "group.deleteGroup": "グループ{n}を削除",
  "group.emoji": "絵文字",
  "group.changeEmoji": "グループ{n}の絵文字を変更",
  "group.color": "色",
  "group.everyone": "全員が担当",
  "group.chooseMembers": "担当者をえらぶ",
  "group.changeColor": "色を変更",
  "group.excludeMember": "{name}を除外",
  "group.resetToAll": "全員にもどす",
  "group.addMember": "メンバーを追加",
  "group.newMember": "新規メンバー",
  "group.taskAt": "グループ{g}のタスク{t}",
  "group.deleteTask": "タスク「{task}」を削除",
  "group.emptyTask": "空",
  "group.addTask": "タスクを追加",

  // オンボーディング
  "onboarding.guide": "ガイド: {title}",
  "onboarding.stepAria": "ステップ {current}/{total}: {title} — {desc}",
  "onboarding.skip": "スキップ",
  "onboarding.back": "戻る",
  "onboarding.start": "始める！",
  "onboarding.next": "次へ",
  "onboarding.tabs.title": "当番表の切り替え",
  "onboarding.tabs.desc": "タブで当番表を切り替えられます",
  "onboarding.edit.title": "まずは中身を編集",
  "onboarding.edit.desc": "メンバーやタスクの追加・削除はここから",
  "onboarding.rotation.title": "順番を送る",
  "onboarding.rotation.desc": "矢印ボタンで次の当番に進められます",
  "onboarding.view.title": "見かたを変える",
  "onboarding.view.desc": "カード・早見表・カレンダーの3種類から選べます",
  "onboarding.print.title": "印刷・PDF保存",
  "onboarding.print.desc": "今の表示をそのまま印刷できます。PDF保存も◎",
  "onboarding.share.title": "みんなに共有",
  "onboarding.share.desc": "QRコードやLINEでかんたんにシェアできます",
  "onboarding.add.title": "当番表を追加",
  "onboarding.add.desc": "掃除・給食・日直など、いくつでも作れます",

  // ローテーションバー
  "rotation.prevAria": "前の当番に戻す",
  "rotation.nextAria": "次の当番に進める",
  "rotation.currentAria": "現在の順番: {n}",
  "rotation.current": "現在の順番",
  "rotation.autoByDate": "日付で自動切り替え",
  "rotation.shareAria": "共有する",
  "rotation.cloudSaved": "クラウド保存済み",
  "rotation.cloudUnsaved": "クラウド未保存",
  "rotation.editAria": "当番表を編集する",

  // ローテーション設定
  "rotationConfig.howToRotate": "交代のしかた",
  "rotationConfig.startDate": "開始日",
  "rotationConfig.cycleDays": "何日ごとに交代？",
  "rotationConfig.cycleDaysAria": "何日ごとに交代するか",
  "rotationConfig.daysUnit": "日ごと",
  "rotationConfig.skipSat": "土曜はお休み",
  "rotationConfig.skipSun": "日曜はお休み",
  "rotationConfig.skipHoliday": "祝日はお休み",

  // 表示切替・印刷
  "view.cards": "カード",
  "view.table": "早見表",
  "view.calendar": "カレンダー",
  "view.disc": "円盤",
  "disc.offDuty": "おやすみ",
  "disc.sheetOuter": "外円（固定・役割）— 外周の線で切り取ってください",
  "disc.sheetInner":
    "内円（回す・担当者）— 外周の線で切り取り、中心を外円に重ねてピンで留めてください",
  "disc.unsupported": "この当番表は円盤にできません。早見表をご利用ください。",
  "disc.unsupportedGroupPool":
    "グループ専用メンバーがいる当番表は円盤にできません。早見表をご利用ください。",
  "disc.unsupportedTooManyTasks":
    "円盤にするには「担当者の数 ≧ タスクの数」にしてください（いまは担当者{members}人・タスク{tasks}個）。タスクをまとめるか担当者を増やすと円盤にできます。それまでは早見表をどうぞ。",
  "print.print": "印刷",
  "print.printAria": "印刷する",

  // ホーム空状態
  "home.empty": "当番表がありません",
  "home.emptyHint": "新しい当番表を作成してください。",
  "home.create": "当番表を作成",

  // 当番表タブ
  "tabs.navAria": "当番表の切り替え",
  "tabs.scrollLeft": "左にスクロール",
  "tabs.scrollRight": "右にスクロール",
  "tabs.tablistAria": "当番表タブ一覧（Alt+矢印キーで並び替え）",
  "tabs.tabAria": "{name}タブ",
  "tabs.pinnedSuffix": "（ピン留め）",
  "tabs.reorderSuffix": "（Alt+矢印キーで並び替え）",
  "tabs.addAria": "新しい当番表を追加",

  // 早見表
  "quickTable.heading": "当番の順番 早見表",
  "quickTable.scrollHint": "横にスクロールできます",
  "quickTable.tableAria": "ローテーション早見表",
  "quickTable.assignee": "担当",

  // カード一覧
  "assignments.listAria": "当番割り当て一覧",

  // カラー
  "color.paletteAria": "カラー選択",
  "color.colorN": "カラー{n}",
  "color.custom": "カスタムカラー",

  // テーマ選択
  "theme.selectAria": "{name}テーマを選択",
  "theme.forPrint": "印刷向け",
  "theme.textureLabel": "質感",
  "theme.colorLabel": "色",
  "texture.sarasara": "さらさら",
  "texture.zarazara": "ざらざら",
  "texture.mochimochi": "もちもち",

  // テーマの色軸。メンバーの色パレットは color.* を使う
  "themeColor.print": "いんさつ",
  "themeColor.blackboard": "こくばん",
  "themeColor.daidai": "だいだい",
  "themeColor.sunflower": "ひまわり",
  "themeColor.hydrangea": "あじさい",
  "themeColor.sakura": "さくら",
  "themeColor.freshGreen": "わかば",
  "themeColor.sky": "そら",
  "themeColor.nightSky": "よぞら",

  // フォント選択（アプリ全体）
  "settings.sectionFont": "文字",
  "font.appliesToAll": "すべての当番表に適用されます",
  "font.selectAria": "{name}の文字を選択",
  "font.standard": "標準",
  "font.handwriting": "手書き",
  "font.elegant": "エレガント",
  "font.print": "印刷",

  // 一括追加
  "bulk.bulkAdd": "📋 一括追加",
  "bulk.placeholderTask":
    "メンバー名を入力（1行に1人、またはカンマ区切り）\n例：田中, 佐藤, 鈴木\n（全タスクに追加されます）",
  "bulk.placeholderMember":
    "名前を入力（1行に1人、またはカンマ区切り）\n例：田中, 佐藤, 鈴木\n（グループも同時に作成されます）",
  "bulk.ariaTask": "メンバーを一括追加",
  "bulk.ariaMember": "メンバーとグループを一括追加",
  "bulk.willAdd": "{n}人を追加します",
  "bulk.add": "追加する",

  // 担当者追加（グループ追加ボタン）
  "group.addAssignee": "担当者を追加",

  // 削除確認
  "confirmDelete.title": "当番表を削除",
  "confirmDelete.message":
    "「{name}」を削除しますか？この操作は元に戻せません。",
  "confirmDelete.confirm": "削除する",

  // インストール案内
  "install.androidTitle": "アプリとして追加",
  "install.androidDesc": "ホーム画面からすぐアクセス",
  "install.add": "追加",
  "install.iosTitle": "ホーム画面に追加",
  "install.iosDescA": "下の共有ボタン",
  "install.iosDescB": "→「ホーム画面に追加」でアプリにできます",

  // スケジュール操作
  "schedule.deleteFailed": "サーバーからの削除に失敗しました",
  "schedule.copyName": "{name}（コピー）",

  // 404
  "notFound.title": "ページが見つかりません",
  "notFound.message":
    "お探しのページは存在しないか、移動した可能性があります。",
  "notFound.home": "ホームへ",
  "notFound.templates": "テンプレートをみる",

  // エラー境界
  "error.unknown": "不明なエラー",
  "error.unexpected": "予期しないエラーが発生しました",
  "error.hideDetails": "詳細を隠す",
  "error.showDetails": "詳細を表示",
  "error.backHome": "ホームに戻る",
  "error.reload": "再読み込み",

  // 編集権限の引き継ぎ
  "transfer.error.notFound": "転送データが見つかりません",
  "transfer.error.broken":
    "転送URLが壊れています。もう一度リンクを取得してください",
  "transfer.error.badFormat": "転送データの形式が正しくありません",
  "transfer.error.invalidLink": "編集リンクが無効か、当番表が見つかりません",
  "transfer.error.saveFailed": "転送データの保存に失敗しました",
  "transfer.updated": "「{name}」の編集権限を更新しました",
  "transfer.added": "「{name}」の編集権限を追加しました",

  // 共有エラー
  "shareErr.publish400": "共有公開のリクエスト内容が不正です",
  "shareErr.save400": "保存内容に不正な値があります",
  "shareErr.auth":
    "編集権限の確認に失敗しました。共有リンクを作り直してください",
  "shareErr.publish404":
    "保存先が見つかりません。もう一度共有をやり直してください",
  "shareErr.save404": "保存先が見つかりません",
  "shareErr.publish500":
    "保存はできましたが公開に失敗しました。時間をおいて再度お試しください",
  "shareErr.save500":
    "サーバーで保存に失敗しました。時間をおいて再度お試しください",
  "shareErr.rateLimit":
    "アクセスが集中しています。少し待ってからもう一度お試しください",
  "shareErr.tooLarge":
    "当番表が大きすぎて保存できません。グループやタスクを減らしてください",
  "shareErr.publishDefault": "保存はできましたが公開に失敗しました",
  "shareErr.saveDefault":
    "保存に失敗しました。ネットワーク接続を確認してください",

  // 今日のバナー
  "today.label": "きょうの当番（{date}）",
  "current.label": "いまの当番（{turn}）",

  // カレンダー
  "cal.manualNote": "手動切り替え：当番は固定です",
  "cal.thisMonth": "今月",
  "cal.dayLabel": "{month}/{day}（{weekday}）",
  "cal.wd0": "日",
  "cal.wd1": "月",
  "cal.wd2": "火",
  "cal.wd3": "水",
  "cal.wd4": "木",
  "cal.wd5": "金",
  "cal.wd6": "土",

  // テンプレート一覧ページ
  "templates.docTitle": "当番表テンプレート一覧｜無料で使えるtoban",
  "templates.breadcrumb": "テンプレート一覧",
  "templates.breadcrumbAria": "パンくず",
  "templates.heading": "当番表テンプレート一覧",
  "templates.subA":
    "学校・保育園・介護施設・自治会・飲食店・家庭など、すぐ使える",
  "templates.subFree": "無料テンプレート",
  "templates.subB":
    "を{count}種類ご用意しました。テンプレートを選んで、メンバーや担当を自由に編集するだけで当番表が完成します。",

  // テンプレート詳細ページ
  "templatesDetail.contents": "テンプレートの内容",
  "templatesDetail.jaNote":
    "※ 以下の内容は日本語で表示されます（作成後に自由に編集できます）。",
  "templatesDetail.taskN": "タスク {n}",
  "templatesDetail.groupN": "グループ {n}",
  "templatesDetail.memberExample": "メンバー例（{count}名）",
  "templatesDetail.editNote": "※ メンバー名・人数・色は自由に編集できます。",
  "templatesDetail.backToList": "テンプレート一覧に戻る",
  "templatesDetail.related": "関連するテンプレート",
  "templatesDetail.createFromThis": "このテンプレートで作る",

  // Roster notices
  "summary.saveFailed":
    "端末に保存できませんでした。内容を失わないよう、この画面を閉じずに保存先の空き容量・設定を確認してください。",
  "summary.beforeStart": "開始前の配置（{date}開始）",
};
