// ═══════════════════════════════════════════════════
//  VENUS GYM — App Core: Boot · Router · i18n · Shell
// ═══════════════════════════════════════════════════

const App = (() => {

  /* ── State ──────────────────────────────────────── */
  let _db       = null;
  let _auth     = null;
  let _user     = null;   // Firebase Auth user
  let _profile  = null;   // Firestore user doc
  let _lang     = localStorage.getItem('venus_lang') || 'en';
  let _page     = 'dashboard';
  let _sidebarCollapsed = localStorage.getItem('venus_sidebar') === '1';

  /* ── i18n Dictionary ─────────────────────────────── */
  const DICT = {
    en: {
      app_name: 'VENUS GYM',
      dashboard: 'Dashboard',
      subscribers: 'Subscribers',
      coaches: 'Coaches',
      sports: 'Sports',
      subscriptions: 'Subscriptions',
      pos: 'Point of Sale',
      reports: 'Reports',
      diet: 'Diet & Workout',
      settings: 'Settings',
      users: 'User Management',
      logout: 'Logout',
      login: 'Sign In',
      email: 'Email Address',
      password: 'Password',
      signing_in: 'Signing in…',
      sign_in_btn: 'Sign In to Venus',
      add: 'Add',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save Changes',
      cancel: 'Cancel',
      confirm: 'Confirm',
      search: 'Search…',
      loading: 'Loading…',
      no_data: 'No data found',
      active: 'Active',
      expired: 'Expired',
      expiring_soon: 'Expiring Soon',
      name: 'Full Name',
      phone: 'Phone',
      address: 'Address',
      email_lbl: 'Email',
      dob: 'Date of Birth',
      gender: 'Gender',
      male: 'Male',
      female: 'Female',
      notes: 'Notes',
      sport: 'Sport',
      coach: 'Coach',
      start_date: 'Start Date',
      end_date: 'End Date',
      price_usd: 'Price (USD)',
      price_lbp: 'Price (LBP)',
      paid: 'Paid',
      remaining: 'Remaining',
      partial: 'Partial',
      cash: 'Cash',
      commission: 'Commission %',
      role: 'Role',
      super_admin: 'Super Admin',
      admin: 'Admin',
      coach_role: 'Coach',
      receptionist: 'Receptionist',
      subscriber_role: 'Subscriber',
      actions: 'Actions',
      total: 'Total',
      just_now: 'Just now',
      min_ago: 'm ago',
      hr_ago: 'h ago',
      day_ago: 'd ago',
      delete_confirm: 'Are you sure you want to delete this record? This action cannot be undone.',
      saved: 'Saved successfully',
      deleted: 'Deleted successfully',
      error_generic: 'Something went wrong. Please try again.',
      welcome: 'Welcome back',
      gym_management: 'GYM MANAGEMENT',
      expiring: 'Expiring',
      days_left: 'days left',
      total_subscribers: 'Total Subscribers',
      active_subs: 'Active Subscriptions',
      revenue_month: 'Revenue This Month',
      total_coaches: 'Total Coaches',
      recent_activity: 'Recent Activity',
      expiring_soon_lbl: 'Expiring This Week',
      add_subscriber: 'Add Subscriber',
      add_coach: 'Add Coach',
      add_sport: 'Add Sport',
      new_subscription: 'New Subscription',
      dollar_rate: 'Dollar Rate',
      inventory: 'Inventory',
      sell: 'Sell',
      quantity: 'Quantity',
      stock: 'Stock',
      category: 'Category',
      checkout: 'Checkout',
      cart: 'Cart',
      empty_cart: 'Cart is empty',
      payment_method: 'Payment Method',
      amount_paid: 'Amount Paid',
      change: 'Change',
      meals: 'Meals',
      workout: 'Workout Plan',
      calories: 'Calories',
      sets: 'Sets',
      reps: 'Reps',
      weight_kg: 'Weight (kg)',
      assign_plan: 'Assign Plan',
      gym_info: 'Gym Information',
      appearance: 'Appearance',
      notifications_lbl: 'Notifications',
      user_mgmt: 'User Management',
      create_user: 'Create User',
      password_reset: 'Reset Password',
      permissions: 'Permissions',
      no_permission: 'You do not have permission to access this section.',
      session_expired: 'Session expired. Please sign in again.',

      backup_title: 'Backup & Restore',
      backup_subtitle: 'Export your gym data to a file, or restore it from a previous backup.',
      backup_export_title: 'Export Backup',
      backup_export_hint: 'Download a full snapshot of the selected collections as a single JSON file.',
      backup_export_btn: 'Export Backup (.json)',
      backup_import_title: 'Import & Restore',
      backup_import_hint: 'Upload a Venus Gym backup file to restore data into this account.',
      backup_choose_file: 'Click to choose a backup .json file',
      backup_toggle_all: 'Select / Deselect all',
      backup_collections_selected: 'collections selected',
      backup_select_one: 'Select at least one collection first.',
      backup_docs: 'documents',
      backup_removed: 'removed',
      backup_restored: 'restored',
      backup_export_success: 'Backup exported successfully',
      backup_restore_success: 'Restore completed successfully',
      backup_restore_partial: 'Restore finished with errors in',
      backup_invalid_file: 'This file is not a valid Venus Gym backup.',
      backup_unknown_collection: 'Not in current schema',
      backup_exported_at: 'Exported on',
      backup_exported_by: 'Exported by',
      backup_total_docs: 'Total documents',
      backup_last_export: 'Last backup',
      backup_overview_fail: 'Could not load collection overview.',
      backup_mode_merge: 'Merge (safe)',
      backup_mode_merge_desc: 'Adds new records and updates matching ones. Nothing existing is deleted.',
      backup_mode_replace: 'Replace (destructive)',
      backup_mode_replace_desc: 'Deletes all current records in the selected collections before restoring.',
      backup_restore_btn: 'Restore Data',
      backup_confirm_title: 'Confirm Restore',
      backup_confirm_merge_msg: 'This will write the selected collections into your live database, updating any matching records. This cannot be undone.',
      backup_confirm_replace_msg: 'This will permanently delete all existing records in the selected collections and replace them with the backup data. This cannot be undone.',
      backup_confirm_type: 'Type',
      backup_auth_note: 'Note: backups include your Firestore data only. Login accounts (email & password) are not included and must be recreated via User Management if needed.',

      backup_reset_title: 'Reset Data',
      backup_reset_hint: 'Permanently clear all records from the selected collections. Use this to start fresh — for example, wiping sample or old-season data. This does not touch user accounts or app settings unless you select them.',
      backup_reset_btn: 'Wipe Selected Data',
      backup_reset_confirm_title: 'Confirm Data Wipe',
      backup_reset_confirm_msg: 'This will permanently delete every document in:',
      backup_no_recent_backup: 'No backup has been recorded yet for this project. We strongly recommend exporting a backup before wiping any data.',
      backup_reset_success: 'Selected data cleared successfully',
    },
    ar: {
      app_name: 'نادي فينوس',
      dashboard: 'لوحة التحكم',
      subscribers: 'المشتركون',
      coaches: 'المدربون',
      sports: 'الرياضات',
      subscriptions: 'الاشتراكات',
      pos: 'نقطة البيع',
      reports: 'التقارير',
      diet: 'الحمية والتمارين',
      settings: 'الإعدادات',
      users: 'إدارة المستخدمين',
      logout: 'تسجيل الخروج',
      login: 'تسجيل الدخول',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      signing_in: 'جاري تسجيل الدخول…',
      sign_in_btn: 'الدخول إلى فينوس',
      add: 'إضافة',
      edit: 'تعديل',
      delete: 'حذف',
      save: 'حفظ التغييرات',
      cancel: 'إلغاء',
      confirm: 'تأكيد',
      search: 'بحث…',
      loading: 'جاري التحميل…',
      no_data: 'لا توجد بيانات',
      active: 'نشط',
      expired: 'منتهي',
      expiring_soon: 'ينتهي قريباً',
      name: 'الاسم الكامل',
      phone: 'رقم الهاتف',
      address: 'العنوان',
      email_lbl: 'البريد الإلكتروني',
      dob: 'تاريخ الميلاد',
      gender: 'الجنس',
      male: 'ذكر',
      female: 'أنثى',
      notes: 'ملاحظات',
      sport: 'الرياضة',
      coach: 'المدرب',
      start_date: 'تاريخ البداية',
      end_date: 'تاريخ الانتهاء',
      price_usd: 'السعر (دولار)',
      price_lbp: 'السعر (ليرة)',
      paid: 'مدفوع',
      remaining: 'المتبقي',
      partial: 'دفع جزئي',
      cash: 'نقداً',
      commission: 'نسبة العمولة %',
      role: 'الدور',
      super_admin: 'مدير عام',
      admin: 'مدير',
      coach_role: 'مدرب',
      receptionist: 'موظف استقبال',
      subscriber_role: 'مشترك',
      actions: 'إجراءات',
      total: 'الإجمالي',
      just_now: 'الآن',
      min_ago: 'د',
      hr_ago: 'س',
      day_ago: 'ي',
      delete_confirm: 'هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.',
      saved: 'تم الحفظ بنجاح',
      deleted: 'تم الحذف بنجاح',
      error_generic: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.',
      welcome: 'مرحباً بك',
      gym_management: 'إدارة النادي الرياضي',
      expiring: 'ينتهي',
      days_left: 'أيام متبقية',
      total_subscribers: 'إجمالي المشتركين',
      active_subs: 'الاشتراكات النشطة',
      revenue_month: 'إيرادات هذا الشهر',
      total_coaches: 'إجمالي المدربين',
      recent_activity: 'النشاطات الأخيرة',
      expiring_soon_lbl: 'تنتهي هذا الأسبوع',
      add_subscriber: 'إضافة مشترك',
      add_coach: 'إضافة مدرب',
      add_sport: 'إضافة رياضة',
      new_subscription: 'اشتراك جديد',
      dollar_rate: 'سعر الدولار',
      inventory: 'المخزون',
      sell: 'بيع',
      quantity: 'الكمية',
      stock: 'المخزون',
      category: 'الفئة',
      checkout: 'إتمام البيع',
      cart: 'عربة التسوق',
      empty_cart: 'عربة التسوق فارغة',
      payment_method: 'طريقة الدفع',
      amount_paid: 'المبلغ المدفوع',
      change: 'الباقي',
      meals: 'وجبات',
      workout: 'برنامج التمرين',
      calories: 'سعرات حرارية',
      sets: 'مجموعات',
      reps: 'تكرارات',
      weight_kg: 'الوزن (كغ)',
      assign_plan: 'تعيين خطة',
      gym_info: 'معلومات النادي',
      appearance: 'المظهر',
      notifications_lbl: 'الإشعارات',
      user_mgmt: 'إدارة المستخدمين',
      create_user: 'إنشاء مستخدم',
      password_reset: 'إعادة تعيين كلمة المرور',
      permissions: 'الصلاحيات',
      no_permission: 'ليس لديك صلاحية الوصول إلى هذا القسم.',
      session_expired: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.',

      backup_title: 'النسخ الاحتياطي والاستعادة',
      backup_subtitle: 'صدّر بيانات النادي إلى ملف، أو استعدها من نسخة احتياطية سابقة.',
      backup_export_title: 'تصدير نسخة احتياطية',
      backup_export_hint: 'حمّل نسخة كاملة من المجموعات المحددة كملف JSON واحد.',
      backup_export_btn: 'تصدير نسخة احتياطية (.json)',
      backup_import_title: 'استيراد واستعادة',
      backup_import_hint: 'ارفع ملف نسخة احتياطية من فينوس لاستعادة البيانات إلى هذا الحساب.',
      backup_choose_file: 'اضغط لاختيار ملف نسخة احتياطية .json',
      backup_toggle_all: 'تحديد / إلغاء تحديد الكل',
      backup_collections_selected: 'مجموعات محددة',
      backup_select_one: 'اختر مجموعة واحدة على الأقل.',
      backup_docs: 'مستندات',
      backup_removed: 'تم حذفها',
      backup_restored: 'تمت استعادتها',
      backup_export_success: 'تم تصدير النسخة الاحتياطية بنجاح',
      backup_restore_success: 'تمت الاستعادة بنجاح',
      backup_restore_partial: 'انتهت الاستعادة مع وجود أخطاء في',
      backup_invalid_file: 'هذا الملف ليس نسخة احتياطية صالحة من فينوس.',
      backup_unknown_collection: 'غير موجودة في المخطط الحالي',
      backup_exported_at: 'تاريخ التصدير',
      backup_exported_by: 'تم التصدير بواسطة',
      backup_total_docs: 'إجمالي المستندات',
      backup_last_export: 'آخر نسخة احتياطية',
      backup_overview_fail: 'تعذر تحميل نظرة عامة على المجموعات.',
      backup_mode_merge: 'دمج (آمن)',
      backup_mode_merge_desc: 'يضيف السجلات الجديدة ويحدّث المطابقة منها. لا يُحذف أي شيء موجود.',
      backup_mode_replace: 'استبدال (خطير)',
      backup_mode_replace_desc: 'يحذف جميع السجلات الحالية في المجموعات المحددة قبل الاستعادة.',
      backup_restore_btn: 'استعادة البيانات',
      backup_confirm_title: 'تأكيد الاستعادة',
      backup_confirm_merge_msg: 'سيتم كتابة المجموعات المحددة في قاعدة بياناتك الحية، وتحديث أي سجلات مطابقة. لا يمكن التراجع عن هذا.',
      backup_confirm_replace_msg: 'سيتم حذف جميع السجلات الحالية في المجموعات المحددة نهائيًا واستبدالها ببيانات النسخة الاحتياطية. لا يمكن التراجع عن هذا.',
      backup_confirm_type: 'اكتب',
      backup_auth_note: 'ملاحظة: تشمل النسخة الاحتياطية بيانات Firestore فقط. حسابات الدخول (البريد وكلمة المرور) غير مشمولة ويجب إعادة إنشائها عبر إدارة المستخدمين عند الحاجة.',

      backup_reset_title: 'إعادة تعيين البيانات',
      backup_reset_hint: 'احذف نهائيًا جميع السجلات من المجموعات المحددة. استخدم هذا للبدء من جديد — مثلاً لمسح بيانات تجريبية أو موسم قديم. لا يؤثر هذا على حسابات المستخدمين أو إعدادات التطبيق ما لم تحددها.',
      backup_reset_btn: 'مسح البيانات المحددة',
      backup_reset_confirm_title: 'تأكيد مسح البيانات',
      backup_reset_confirm_msg: 'سيتم حذف كل مستند نهائيًا في:',
      backup_no_recent_backup: 'لم يتم تسجيل أي نسخة احتياطية بعد لهذا المشروع. نوصي بشدة بتصدير نسخة احتياطية قبل مسح أي بيانات.',
      backup_reset_success: 'تم مسح البيانات المحددة بنجاح',
    }
  };

  /* ── Translation helper ──────────────────────────── */
  function t(key) { return (DICT[_lang] || DICT.en)[key] || key; }

  /* ── Nav definition ──────────────────────────────── */
  function navItems() {
    return [
      { section: null, items: [
        { id: 'dashboard',     icon: Icon.render('dashboard'),     label: t('dashboard'),    roles: ['*'] },
      ]},
      { section: t('subscribers'), items: [
        { id: 'subscribers',   icon: Icon.render('subscribers'),   label: t('subscribers'),  roles: ['super_admin','admin','receptionist'] },
        { id: 'subscriptions', icon: Icon.render('subscriptions'), label: t('subscriptions'),roles: ['super_admin','admin','receptionist','coach'] },
      ]},
      { section: t('coaches') + ' & ' + t('sports'), items: [
        { id: 'coaches',       icon: Icon.render('coaches'),       label: t('coaches'),      roles: ['super_admin','admin'] },
        { id: 'sports',        icon: Icon.render('sports'),        label: t('sports'),       roles: ['super_admin','admin'] },
      ]},
      { section: t('pos') + ' & ' + t('reports'), items: [
        { id: 'pos',           icon: Icon.render('pos'),           label: t('pos'),          roles: ['super_admin','admin','receptionist'] },
        { id: 'reports',       icon: Icon.render('reports'),       label: t('reports'),      roles: ['super_admin','admin'] },
      ]},
      { section: t('diet'), items: [
        { id: 'diet',          icon: Icon.render('diet'),          label: t('diet'),         roles: ['super_admin','admin','coach'] },
      ]},
      { section: t('settings'), items: [
        { id: 'users',         icon: Icon.render('users'),         label: t('users'),        roles: ['super_admin'] },
        { id: 'settings',      icon: Icon.render('settings'),      label: t('settings'),     roles: ['super_admin','admin'] },
        { id: 'backup',        icon: Icon.render('backup'),        label: t('backup_title'), roles: ['super_admin'] },
      ]},
    ];
  }

  /* ── Permission Check ────────────────────────────── */
  function hasPermission(pageId) {
    if (!_profile) return false;
    const role = _profile.role;
    if (role === ROLES.SUPER_ADMIN) return true;
    const allowed = PERMISSIONS[role] || [];
    return allowed.includes(pageId) || allowed.includes('*');
  }

  /* ── Sidebar Render ──────────────────────────────── */
  function renderSidebar() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav || !_profile) return;

    let html = '';
    const role = _profile.role;

    navItems().forEach(({ section, items }) => {
      const visible = items.filter(item =>
        item.roles.includes('*') || item.roles.includes(role) || role === ROLES.SUPER_ADMIN
      );
      if (!visible.length) return;

      if (section) html += `<div class="nav-section-label">${section}</div>`;
      visible.forEach(item => {
        html += `
          <div class="nav-item${_page === item.id ? ' active' : ''}"
               data-page="${item.id}"
               data-tooltip="${item.label}"
               onclick="App.navigate('${item.id}')">
            <span class="nav-icon">${item.icon}</span>
            <span class="nav-label">${item.label}</span>
          </div>`;
      });
    });

    nav.innerHTML = html;

    // User info in footer
    const userAvatar = document.getElementById('sidebar-user-avatar');
    const userName   = document.getElementById('sidebar-user-name');
    const userRole   = document.getElementById('sidebar-user-role');
    if (userAvatar) userAvatar.textContent = initials(_profile.displayName || _profile.name || '?');
    if (userName)   userName.textContent   = _profile.displayName || _profile.name || '—';
    if (userRole)   userRole.textContent   = t(_profile.role) || _profile.role;
  }

  /* ── Sidebar Collapse ────────────────────────────── */
  function initSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggle  = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');

    // Desktop: restore collapsed state
    if (_sidebarCollapsed && window.innerWidth > 900) {
      sidebar?.classList.add('collapsed');
      if (toggle) toggle.textContent = '›';
    }

    // Desktop collapse toggle
    toggle?.addEventListener('click', () => {
      if (window.innerWidth <= 900) return;
      sidebar?.classList.toggle('collapsed');
      _sidebarCollapsed = sidebar?.classList.contains('collapsed');
      localStorage.setItem('venus_sidebar', _sidebarCollapsed ? '1' : '0');
      toggle.textContent = _sidebarCollapsed ? '›' : '‹';
    });

    // Mobile hamburger
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
      toggleMobileSidebar();
    });

    // Close on overlay click
    overlay?.addEventListener('click', closeMobileSidebar);

    // Close on nav item click (mobile)
    document.addEventListener('click', (e) => {
      if (window.innerWidth > 900) return;
      if (e.target.closest('.nav-item') && sidebar?.classList.contains('mobile-open')) {
        closeMobileSidebar();
      }
    });

    // Resize handler
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) {
        closeMobileSidebar();
        if (_sidebarCollapsed) sidebar?.classList.add('collapsed');
      }
    });
  }

  function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isOpen  = sidebar?.classList.toggle('mobile-open');
    if (overlay) overlay.classList.toggle('active', isOpen);
  }

  function closeMobileSidebar() {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');
  }

  /* ── Language Toggle ─────────────────────────────── */
  function setLang(lang) {
    _lang = lang;
    localStorage.setItem('venus_lang', lang);
    document.body.classList.toggle('lang-ar', lang === 'ar');
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);

    // Close mobile sidebar first (position changes on RTL switch)
    closeMobileSidebar();

    // Re-render
    renderSidebar();
    navigate(_page);

    // Update all lang toggle buttons
    document.querySelectorAll('#lang-toggle-btn').forEach(btn => {
      btn.textContent = lang === 'ar' ? '🌐 EN' : '🌐 ع';
    });

    // Update sidebar collapse toggle arrow direction
    const toggle = document.getElementById('sidebar-toggle');
    if (toggle) toggle.textContent = lang === 'ar' ? (_sidebarCollapsed ? '‹' : '›') : (_sidebarCollapsed ? '›' : '‹');
  }

  /* ── Page Router ─────────────────────────────────── */
  function navigate(pageId) {
    if (!_profile) return;

    if (!hasPermission(pageId)) {
      Toast.warning(t('no_permission'));
      return;
    }

    _page = pageId;

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === pageId);
    });

    // Update topbar title
    const nav = navItems().flatMap(g => g.items).find(i => i.id === pageId);
    const titleEl = document.getElementById('topbar-page-title');
    if (titleEl) titleEl.textContent = nav?.label || pageId;

    // Render module
    const content = document.getElementById('page-content');
    if (!content) return;
    content.innerHTML = `<div class="page-loader"><div class="spinner"></div><span>${t('loading')}</span></div>`;

    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');

    // Lazy-load module
    const loaders = {
      dashboard:     () => DashboardModule?.render(_db, _profile),
      subscribers:   () => SubscribersModule?.render(_db, _profile),
      subscriptions: () => SubscriptionsModule?.render(_db, _profile),
      coaches:       () => CoachesModule?.render(_db, _profile),
      sports:        () => SportsModule?.render(_db, _profile),
      pos:           () => POSModule?.render(_db, _profile),
      reports:       () => ReportsModule?.render(_db, _profile),
      diet:          () => DietModule?.render(_db, _profile),
      users:         () => UsersModule?.render(_db, _profile),
      settings:      () => SettingsModule?.render(_db, _profile),
      backup:        () => BackupModule?.render(_db, _profile),
    };

    const loader = loaders[pageId];
    if (loader) {
      return Promise.resolve()
        .then(loader)
        .catch(e => {
          console.error(`Module error [${pageId}]:`, e);
          content.innerHTML = `<div class="page-loader" style="color:var(--danger)">⚠ Failed to load module</div>`;
        });
    }
  }

  /* ── Auth State Bootstrap ────────────────────────── */
  async function boot() {
    // Init Firebase
    firebase.initializeApp(FIREBASE_CONFIG);
    _db   = firebase.firestore();
    _auth = firebase.auth();

    // Load dollar rate from settings
    try {
      const settingsDoc = await _db.collection(COL.SETTINGS).doc('global').get();
      if (settingsDoc.exists) {
        Currency.setRate(settingsDoc.data().dollarRate || 89500);
      }
    } catch(e) {}

    // Listen to auth state
    _auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        _user = firebaseUser;
        try {
          const profileDoc = await _db.collection(COL.USERS).doc(firebaseUser.uid).get();
          if (profileDoc.exists) {
            const data = profileDoc.data();
            // Normalise active field — Firestore console may save it as string "true"
            if (data.active === undefined) data.active = true;
            if (data.active === 'true')    data.active = true;
            if (data.active === 'false')   data.active = false;
            _profile = { id: profileDoc.id, ...data };
            if (_profile.active === false) {
              await _auth.signOut();
              showLogin('Your account has been disabled. Contact the administrator.');
              return;
            }
            showApp();
          } else {
            // Profile doc missing in Firestore — show helpful message
            console.error('No Firestore profile for UID:', firebaseUser.uid,
              '— Make sure a document exists in the "users" collection with this UID as the document ID.');
            await _auth.signOut();
            showLogin('Account profile not found. Make sure the Firestore "users" collection has a document with your UID.');
          }
        } catch (e) {
          console.error('Auth state error:', e);
          showLogin('Connection error: ' + (e.message || 'Please check Firestore rules.'));
        }
      } else {
        _user = null;
        _profile = null;
        showLogin();
      }
    });
  }

  /* ── Show Login Screen ───────────────────────────── */
  function showLogin(errorMsg = '') {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
    if (errorMsg) {
      const errEl = document.getElementById('auth-error');
      if (errEl) { errEl.textContent = errorMsg; errEl.classList.add('show'); }
    }
    setLang(_lang);
  }

  /* ── Show App Shell ──────────────────────────────── */
  function showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    setLang(_lang);
    initSidebarToggle();
    renderSidebar();
    navigate('dashboard');
    Toast.success(`${t('welcome')}, ${_profile.displayName || _profile.name || ''}!`);
  }

  /* ── Auth Module wiring ──────────────────────────── */
  async function login(email, password) {
    try {
      await _auth.signInWithEmailAndPassword(email, password);
    } catch (e) {
      const msgs = {
        'auth/wrong-password':   'Incorrect password.',
        'auth/user-not-found':   'No account with this email.',
        'auth/too-many-requests':'Too many attempts. Try later.',
        'auth/invalid-email':    'Invalid email address.',
      };
      throw new Error(msgs[e.code] || t('error_generic'));
    }
  }

  async function logout() {
    await _auth.signOut();
    Toast.info('Signed out.');
  }

  /* ── Public API ──────────────────────────────────── */
  return {
    boot,
    login,
    logout,
    navigate,
    t,
    get db()      { return _db; },
    get user()    { return _user; },
    get profile() { return _profile; },
    get lang()    { return _lang; },
    setLang,
    hasPermission,
    renderSidebar,
    get dollarRate() { return Currency.dollarRate; },
  };

})();

/* ── Login form handler ──────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  App.boot();

  // Login form
  const loginForm = document.getElementById('login-form');
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const err = document.getElementById('auth-error');
    const email = document.getElementById('login-email').value.trim();
    const pw    = document.getElementById('login-password').value;
    if (!email || !pw) return;

    btn.disabled = true;
    btn.textContent = App.t('signing_in');
    err.classList.remove('show');

    try {
      await App.login(email, pw);
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.add('show');
      btn.disabled = false;
      btn.textContent = App.t('sign_in_btn');
    }
  });

  // Lang toggle — wire ALL buttons with this id
  document.querySelectorAll('#lang-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      App.setLang(App.lang === 'en' ? 'ar' : 'en');
    });
  });

  // Password toggle in login
  document.getElementById('pw-toggle')?.addEventListener('click', () => {
    const inp = document.getElementById('login-password');
    const icon = document.getElementById('pw-toggle');
    if (inp.type === 'password') { inp.type = 'text'; icon.textContent = '🙈'; }
    else { inp.type = 'password'; icon.textContent = '👁'; }
  });
});