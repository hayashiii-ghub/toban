// English dictionary. UI chrome only.
// Template / member / theme content stays Japanese (see ja.ts).
// Keys mirror ja.ts; missing keys fall back to ja at runtime.

export const en: Record<string, string> = {
  "lang.switchLabel": "Language",
  "lang.ja": "日本語",
  "lang.en": "English",

  "footer.about": "About toban",

  // Common
  "common.close": "Close",

  // Rotation label (shared + Home)
  "rotation.initial": "Start",
  "rotation.nth": "Turn {n}",

  // Shared schedule view
  "shared.printUnsupported":
    "This browser can't print. Please open the page in Safari or Chrome.",
  "shared.error.notFound": "Schedule not found",
  "shared.error.server":
    "A server error occurred. Please try again in a moment.",
  "shared.error.fetch": "Failed to load the data",
  "shared.error.network":
    "A network error occurred. Please check your connection.",
  "shared.copied": "Schedule copied",
  "shared.createYourOwn": "Create your own schedule",
  "shared.copyToMine": "Copy this schedule to my own",
  "shared.printHeader": "{label} · Printed: {date}",

  // Share modal
  "share.title": "Share",
  "share.tabView": "👀 View only",
  "share.tabEdit": "✏️ Can edit",
  "share.descView":
    'Use this to show your schedule to everyone. Anyone can view "{name}".',
  "share.descEdit":
    'Use this to edit together. You can give edit access to "{name}".',
  "share.lineShare": "Share on LINE",
  "share.showQr": "Show QR code",
  "share.hideQr": "Hide QR code",
  "share.copied": "Copied",
  "share.copyUrl": "Copy URL",
  "share.copiedView": "View link copied",
  "share.copiedEdit": "Edit link copied",
  "share.copyFailed":
    "Couldn't copy. Please select the URL and copy it manually.",
  "share.editWarning":
    "Anyone with this URL can edit the schedule. Share only with people you trust.",
  // Keep in sync with CLEANUP_RETENTION_DAYS in server/worker.ts
  "share.retention":
    "Shared schedules are deleted automatically after one year with no edits.",

  // Landing page
  "lp.docTitle": "toban — Free Duty Roster App & Maker | Create, Print & Share",
  "lp.shareText":
    "Easy duty rosters, ready in minutes. Create rotation schedules for cleaning, lunch, and daily duties for free.",
  "lp.shareTitle": "toban | Easy Duty Rosters",
  "lp.shareToban": "Share toban",
  "lp.shareMenuClose": "Close share menu",
  "lp.shareX": "Share on X",
  "lp.urlCopied": "URL copied",
  "lp.copyFailed": "Couldn't copy",
  "lp.createSchedule": "Create a schedule",
  "lp.heroTitleA": "Easy duty rosters,",
  "lp.heroTitleB": "ready in minutes.",
  "lp.heroSubA":
    "Create duty rosters for schools, nurseries, care homes, community groups, offices, and homes—",
  "lp.heroSubB": "free, easy to make, print, and share.",
  "lp.featuresHeading": "Why toban",
  "lp.feat.noSignup.label": "No sign-up",
  "lp.feat.noSignup.desc":
    "No Excel needed. Works right in your browser, on your phone or your computer.",
  "lp.feat.print.label": "Clean printing",
  "lp.feat.print.desc":
    "Print in four formats: cards, table, calendar, or wheel.",
  "lp.feat.share.label": "Share by URL",
  "lp.feat.share.desc": "Generate a share URL and send it via LINE or email.",
  "lp.feat.free.label": "Completely free",
  "lp.feat.free.desc": "All features are free to use.",
  "lp.templatesHeading": "Ready-to-use templates",
  "lp.templatesSubtitle":
    "Pick from {count} templates and just add your members.",
  "lp.viewAllTemplates": "See all templates",
  "lp.viewJunban": "Decide order with the wheel",
  "lp.faqHeading": "FAQ",

  // Contact form
  "contact.heading": "Contact",
  "contact.subtitle":
    "Bug reports, feature requests—feel free to get in touch.",
  "contact.categoryLabel": "Inquiry type",
  "contact.selectPlaceholder": "Please select",
  "contact.emailLabel": "Email address",
  "contact.messageLabel": "Your message",
  "contact.messagePlaceholder":
    "Bug reports, feature requests—feel free to write anything.",
  "contact.sending": "Sending…",
  "contact.submit": "Send",
  "contact.sent": "Sent",
  "contact.sentDetail":
    "Thank you for reaching out. We'll review your message and get back to you.",
  "contact.sendAnother": "Send another message",
  "contact.error": "Failed to send. Please try again in a moment.",

  // Common actions
  "common.save": "Save",
  "common.delete": "Delete",
  "common.duplicate": "Duplicate",
  "common.cancel": "Cancel",

  // New schedule modal (frame only; template list stays Japanese)
  "newSchedule.title": "Create a new schedule",
  "newSchedule.instruction":
    "Choose a template. You can edit everything later.",
  "newSchedule.createBlank": "Start from scratch",
  "newSchedule.createBlankDesc": "Build a schedule from a blank slate",

  // Settings modal
  "settings.title": "Edit",
  "settings.unsaved": "Unsaved",
  "settings.newTask": "New task",
  "settings.confirmClose": "Your changes haven't been saved. Close anyway?",
  "settings.errorNeedTask": "At least one task is required.",
  "settings.errorNeedMember": "At least one member is required.",
  "settings.maxMembersReached": "Up to {n} members allowed.",
  "settings.maxGroupsReached": "Up to {n} groups allowed.",
  "settings.maxTasksReached": "Up to {n} tasks per group allowed.",
  "settings.rotationManual": "Switch manually",
  "settings.rotationDate": "Auto by date",
  "settings.viewByTask": "By task",
  "settings.viewByMember": "By member",
  "settings.summaryTaskMode": "{tasks} tasks · {members} people",
  "settings.summaryMemberMode": "{members} people · {groups} groups",
  "settings.sectionBasic": "Basic settings",
  "settings.scheduleName": "Schedule name",
  "settings.scheduleNamePlaceholder":
    "e.g. Cleaning duty, Lunch duty, Daily duty...",
  "settings.pin": "Pin to front",
  "settings.unpin": "Unpin",
  "settings.pinTab": "Pin tab to front",
  "settings.chooseView": "Choose a view",
  "settings.whoDoesWhat": "Who does what",
  "settings.whatByWhom": "What, by whom",
  "settings.sectionDesign": "Theme",
  "settings.sectionContent": "Edit content",

  // Group / member / task editing
  "group.moveGroupUp": "Move group up",
  "group.moveGroupDown": "Move group down",
  "group.moveUp": "Move up",
  "group.moveDown": "Move down",
  "group.emojiOf": "Group {n} emoji",
  "group.taskNamePlaceholder": "Enter a task name",
  "group.taskNameOf": "Task {n} name",
  "group.namePlaceholder": "Enter a name",
  "group.memberNameOf": "Member {n} name",
  "group.memberName": "Member name",
  "group.details": "Details",
  "group.deleteGroup": "Delete group {n}",
  "group.emoji": "Emoji",
  "group.changeEmoji": "Change group {n} emoji",
  "group.color": "Color",
  "group.everyone": "Everyone",
  "group.chooseMembers": "Choose members",
  "group.changeColor": "Change color",
  "group.excludeMember": "Remove {name}",
  "group.resetToAll": "Reset to all",
  "group.addMember": "Add member",
  "group.newMember": "New member",
  "group.taskAt": "Group {g} task {t}",
  "group.deleteTask": 'Delete task "{task}"',
  "group.emptyTask": "empty",
  "group.addTask": "Add task",

  // Onboarding
  "onboarding.guide": "Guide: {title}",
  "onboarding.stepAria": "Step {current}/{total}: {title} — {desc}",
  "onboarding.skip": "Skip",
  "onboarding.back": "Back",
  "onboarding.start": "Get started!",
  "onboarding.next": "Next",
  "onboarding.tabs.title": "Switch between schedules",
  "onboarding.tabs.desc": "Use the tabs to switch schedules",
  "onboarding.edit.title": "Start by editing",
  "onboarding.edit.desc": "Add or remove members and tasks here",
  "onboarding.rotation.title": "Advance the rotation",
  "onboarding.rotation.desc": "Use the arrows to move to the next turn",
  "onboarding.view.title": "Change the view",
  "onboarding.view.desc": "Choose from cards, table, or calendar",
  "onboarding.print.title": "Print or save as PDF",
  "onboarding.print.desc":
    "Print the current view as-is. PDF export works too.",
  "onboarding.share.title": "Share with everyone",
  "onboarding.share.desc": "Share easily via QR code or LINE",
  "onboarding.add.title": "Add a schedule",
  "onboarding.add.desc":
    "Create as many as you like—cleaning, lunch, daily duty, and more",

  // Rotation bar
  "rotation.prevAria": "Go to previous turn",
  "rotation.nextAria": "Advance to next turn",
  "rotation.currentAria": "Current turn: {n}",
  "rotation.current": "Current turn",
  "rotation.autoByDate": "Switches automatically by date",
  "rotation.shareAria": "Share",
  "rotation.cloudSaved": "Saved to cloud",
  "rotation.cloudUnsaved": "Not saved to cloud",
  "rotation.editAria": "Edit schedule",

  // Rotation settings
  "rotationConfig.howToRotate": "How to rotate",
  "rotationConfig.startDate": "Start date",
  "rotationConfig.cycleDays": "Rotate every how many days?",
  "rotationConfig.cycleDaysAria": "How many days between rotations",
  "rotationConfig.daysUnit": "days",
  "rotationConfig.skipSat": "Skip Saturdays",
  "rotationConfig.skipSun": "Skip Sundays",
  "rotationConfig.skipHoliday": "Skip holidays",

  // View switch / print
  "view.cards": "Cards",
  "view.table": "Table",
  "view.calendar": "Calendar",
  "view.disc": "Disc",
  "disc.offDuty": "Off",
  "disc.sheetOuter": "Outer ring (fixed — roles) — cut along the outer line",
  "disc.sheetInner":
    "Inner disc (rotating — members) — cut along the outer line, center it on the outer ring and pin",
  "disc.unsupported":
    "This chart can't be shown as a disc. Please use the Table view.",
  "disc.unsupportedGroupPool":
    "Charts with group-specific members can't be shown as a disc. Please use the Table view.",
  "disc.unsupportedTooManyTasks":
    "To use the disc, keep members ≥ tasks (currently {members} members, {tasks} tasks). Merge tasks or add members to enable the disc. Until then, please use the Table view.",
  "print.print": "Print",
  "print.printAria": "Print",

  // Home empty state
  "home.empty": "No schedules yet",
  "home.emptyHint": "Create a new schedule to get started.",
  "home.create": "Create a schedule",

  // Schedule tabs
  "tabs.navAria": "Switch schedules",
  "tabs.scrollLeft": "Scroll left",
  "tabs.scrollRight": "Scroll right",
  "tabs.tablistAria": "Schedule tabs (Alt+Arrow keys to reorder)",
  "tabs.tabAria": "{name} tab",
  "tabs.pinnedSuffix": " (pinned)",
  "tabs.reorderSuffix": " (Alt+Arrow keys to reorder)",
  "tabs.addAria": "Add a new schedule",

  // Quick-view table
  "quickTable.heading": "Rotation quick view",
  "quickTable.scrollHint": "Scroll horizontally",
  "quickTable.tableAria": "Rotation quick-view table",
  "quickTable.assignee": "Assignee",

  // Card grid
  "assignments.listAria": "Assignment list",

  // Color
  "color.paletteAria": "Color selection",
  "color.colorN": "Color {n}",
  "color.custom": "Custom color",

  // Theme picker
  "theme.selectAria": "Select the {name} theme",
  "theme.forPrint": "Print-friendly",
  "theme.textureLabel": "Texture",
  "theme.colorLabel": "Color",
  "texture.sarasara": "sarasara",
  "texture.zarazara": "zarazara",
  "texture.mochimochi": "mochimochi",

  // Theme color axis
  "themeColor.print": "Print",
  "themeColor.blackboard": "Blackboard",
  "themeColor.daidai": "Orange",
  "themeColor.sunflower": "Sunflower",
  "themeColor.hydrangea": "Hydrangea",
  "themeColor.sakura": "Cherry blossom",
  "themeColor.freshGreen": "Fresh green",
  "themeColor.sky": "Sky",
  "themeColor.nightSky": "Night sky",

  // Font selection (whole app)
  "settings.sectionFont": "Font",
  "font.appliesToAll": "Applies to every roster",
  "font.selectAria": "Select the {name} font",
  "font.standard": "Standard",
  "font.handwriting": "Handwriting",
  "font.elegant": "Elegant",
  "font.print": "Print",

  // Bulk add
  "bulk.bulkAdd": "📋 Bulk add",
  "bulk.placeholderTask":
    "Enter member names (one per line or comma-separated)\ne.g. Alex, Sam, Riley\n(added to all tasks)",
  "bulk.placeholderMember":
    "Enter names (one per line or comma-separated)\ne.g. Alex, Sam, Riley\n(groups are created at the same time)",
  "bulk.ariaTask": "Bulk add members",
  "bulk.ariaMember": "Bulk add members and groups",
  "bulk.willAdd": "Adding {n} people",
  "bulk.add": "Add",

  // Add-assignee (group add button)
  "group.addAssignee": "Add member",

  // Delete confirmation
  "confirmDelete.title": "Delete schedule",
  "confirmDelete.message": 'Delete "{name}"? This can\'t be undone.',
  "confirmDelete.confirm": "Delete",

  // Install prompt
  "install.androidTitle": "Add as app",
  "install.androidDesc": "Quick access from your home screen",
  "install.add": "Add",
  "install.iosTitle": "Add to home screen",
  "install.iosDescA": "Tap the Share button below",
  "install.iosDescB": '→ "Add to Home Screen" to install',

  // Schedule actions
  "schedule.deleteFailed": "Failed to delete from the server",
  "schedule.copyName": "{name} (copy)",

  // 404
  "notFound.title": "Page not found",
  "notFound.message":
    "The page you're looking for doesn't exist or may have moved.",
  "notFound.home": "Home",
  "notFound.templates": "Browse templates",

  // Error boundary
  "error.unknown": "Unknown error",
  "error.unexpected": "An unexpected error occurred",
  "error.hideDetails": "Hide details",
  "error.showDetails": "Show details",
  "error.backHome": "Back to home",
  "error.reload": "Reload",

  // Edit-access transfer
  "transfer.error.notFound": "Transfer data not found",
  "transfer.error.broken":
    "The transfer URL is broken. Please get the link again.",
  "transfer.error.badFormat": "The transfer data format is invalid.",
  "transfer.error.invalidLink":
    "The edit link is invalid or the schedule was not found.",
  "transfer.error.saveFailed": "Failed to save the transfer data.",
  "transfer.updated": 'Updated edit access for "{name}"',
  "transfer.added": 'Added edit access for "{name}"',

  // Share errors
  "shareErr.publish400": "The share request was invalid",
  "shareErr.save400": "The saved content contains invalid values",
  "shareErr.auth":
    "Couldn't verify edit access. Please recreate the share link.",
  "shareErr.publish404": "Save destination not found. Please share again.",
  "shareErr.save404": "Save destination not found",
  "shareErr.publish500":
    "Saved, but publishing failed. Please try again later.",
  "shareErr.save500": "The server failed to save. Please try again later.",
  "shareErr.rateLimit": "Too many requests right now. Please try again shortly",
  "shareErr.tooLarge":
    "This schedule is too large to save. Try removing some groups or tasks",
  "shareErr.publishDefault": "Saved, but publishing failed",
  "shareErr.saveDefault":
    "Failed to save. Please check your network connection.",

  // Today banner
  "today.label": "Today's duty ({date})",
  "current.label": "Current duty ({turn})",

  // Calendar
  "cal.manualNote": "Manual mode: assignments are fixed",
  "cal.thisMonth": "This month",
  "cal.dayLabel": "{month}/{day} ({weekday})",
  "cal.wd0": "Sun",
  "cal.wd1": "Mon",
  "cal.wd2": "Tue",
  "cal.wd3": "Wed",
  "cal.wd4": "Thu",
  "cal.wd5": "Fri",
  "cal.wd6": "Sat",

  // Templates list page
  "templates.docTitle": "Duty Roster Templates | Free with toban",
  "templates.breadcrumb": "Templates",
  "templates.breadcrumbAria": "Breadcrumb",
  "templates.heading": "Duty Roster Templates",
  "templates.subA": "Ready-to-use ",
  "templates.subFree": "free templates",
  "templates.subB":
    " — {count} of them. Pick one and just edit the members and assignments to finish your roster.",

  // Template detail page
  "templatesDetail.contents": "Template contents",
  "templatesDetail.jaNote":
    "The contents below are shown in Japanese. You can edit everything freely after creating.",
  "templatesDetail.taskN": "Task {n}",
  "templatesDetail.groupN": "Group {n}",
  "templatesDetail.memberExample": "Example members ({count})",
  "templatesDetail.editNote":
    "* Member names, counts, and colors are fully editable.",
  "templatesDetail.backToList": "Back to templates",
  "templatesDetail.related": "Related templates",
  "templatesDetail.createFromThis": "Create with this template",

  // Roster notices
  "summary.sharedEdits":
    "Edits to an already published roster also sync to its public link.",
  "summary.saveFailed":
    "Could not save on this device. Keep this page open and check storage space and settings to avoid losing your changes.",
  "summary.beforeStart": "Initial placement (starts {date})",
};
