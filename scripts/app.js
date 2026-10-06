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
      sport_courses: 'Sport Courses',
      new_course: 'New Course',
      course_search_placeholder: 'Search course, place, coach or member…',
      all_status: 'All Status',
      status_upcoming: 'Upcoming',
      status_completed: 'Completed',
      course_details: 'Course Details',
      course_name: 'Course Name',
      place: 'Place',
      price_per_member: 'Price per Member (USD)',
      duration: 'Duration',
      duration_days: 'Days',
      duration_weeks: 'Weeks',
      duration_months: 'Months',
      duration_sessions: 'Sessions',
      expected_revenue: 'Expected Revenue',
      collected: 'Collected',
      coach_cost_expenses: 'Coach Cost + Expenses',
      net_profit: 'Net Profit',
      manage: 'Manage',
      member_singular: 'member',
      member_plural: 'members',
      coach_singular: 'coach',
      coach_plural: 'coaches',
      tab_overview: 'Overview',
      tab_members: 'Members',
      tab_expenses: 'Expenses',
      course_name_placeholder: 'e.g. Summer Swimming Camp',
      place_placeholder: 'e.g. Main Pool',
      optional_add_later: '— optional, can also be added later',
      add_expense_btn: '+ Add Expense',
      select_coach_placeholder: 'Select coach…',
      select_coach_to_add: 'Select a coach to add…',
      all_coaches_assigned: 'All coaches already assigned',
      cost: 'Cost',
      label: 'Label',
      amount: 'Amount',
      date: 'Date',
      no_coaches_yet: 'No coaches assigned yet',
      no_members_yet: 'No members enrolled yet',
      no_expenses_yet: 'No expenses recorded yet',
      no_coaches_added_create: 'No coaches added yet.',
      no_expenses_added_create: 'No expenses added yet.',
      fee: 'Fee',
      member: 'Member',
      status_lbl: 'Status',
      subscriber_tag: 'Subscriber',
      guest_tag: 'Guest',
      search_subscriber_or_type: 'Search subscriber or type a new name…',
      phone_optional: 'Phone (optional)',
      pick_coach_first: 'Pick a coach first',
      enter_name_or_pick: 'Enter a name or pick a subscriber',
      enter_expense_label: 'Enter an expense label',
      no_subscriber_match: 'No subscriber match — press Add to enroll as a guest',
      record_payment_title: 'Record Payment',
      confirm_payment_btn: '💰 Confirm Payment',
      confirm_payment_of: 'Confirm payment of',
      for_member: 'for',
      payment_recorded: 'Payment recorded!',
      remove_coach_title: 'Remove Coach',
      remove_member_title: 'Remove Member',
      remove_expense_title: 'Remove Expense',
      remove_btn: 'Remove',
      delete_course_title: 'Delete Course',
      delete_course_btn: '🗑 Delete Course',
      close: 'Close',
      course_word: 'Course',
      courses_word: 'courses',
      expense_label_placeholder: 'Expense label (e.g. Equipment rental)',
      // Subscribers section
      export_btn: 'Export',
      search_name_phone_sport: 'Search name, phone, or sport…',
      all_sports: 'All Sports',
      all_coaches: 'All Coaches',
      all_payments: 'All Payments',
      has_balance: 'Has balance (unpaid/partial)',
      no_subscription_lbl: 'No subscription',
      expires: 'Expires',
      no_matches: 'No matches',
      no_matching_subscribers: 'No matching subscribers',
      session_time: 'Session time',
      no_recent_activity: 'No recent activity',
      renew_btn: 'Renew',
      no_expiring_subscriptions: '🎉 No expiring subscriptions',
      ends_word: 'ends',
      pos_subtitle: 'Sell products to gym members',
      search_products_placeholder: 'Search products…',
      all_categories: 'All Categories',
      cat_water: 'Water', cat_food: 'Food', cat_supplement: 'Supplements', cat_gear: 'Gear', cat_apparel: 'Apparel', cat_other: 'Other',
      clear_btn: 'Clear',
      subtotal_usd: 'Subtotal (USD)',
      subtotal_lbp: 'Subtotal (LBP)',
      customer_optional: 'Customer (optional)',
      name_or_phone_placeholder: 'Name or phone',
      change_word: 'Change',
      sale_completed: 'Sale completed! 🎉',
      inventory_manager_title: '📦 Inventory Manager',
      add_product_btn: '+ Add Product',
      add_product_title: 'Add Product',
      delete_product_title: 'Delete Product',
      reports_subtitle: 'Financial overview & analytics',
      period_this_month: 'This Month',
      period_last_3_months: 'Last 3 Months',
      period_this_year: 'This Year',
      period_all_time: 'All Time',
      period_last_month: 'Last Month',
      period_last_6_months: 'Last 6 Months',
      all_dates: 'All Dates',
      custom_range: 'Custom Range…',
      from_date: 'From',
      to_date: 'To',
      start_date_filter_hint: 'Filters by subscription start date',
      subscription_revenue: 'Subscription Revenue',
      pos_revenue: 'POS Revenue',
      total_revenue: 'Total Revenue',
      revenue_by_sport: 'Revenue by Sport',
      all_time_word: 'All time',
      coach_commissions: 'Coach Commissions',
      course_costs_kpi: 'Course Coaches + Expenses',
      total_outgoings: 'Total Outgoings',
      total_net_profit: 'Net Profit',
      due_this_period: 'Due this period',
      subscribers_col: 'Subscribers',
      revenue_col: 'Revenue',
      commission_pct: 'Commission %',
      commission_usd: 'Commission $',
      no_coach_assignments: 'No coach assignments',
      subscription_status_title: 'Subscription Status',
      pos_sales_summary: 'POS Sales Summary',
      total_transactions: 'Total Transactions',
      avg_per_sale: 'Avg. per Sale',
      failed_load_reports: 'Failed to load reports.',
      diet_subtitle: 'Assign meal & workout plans to subscribers',
      search_by_subscriber: 'Search by subscriber…',
      meal_plan_title: '🥗 Meal Plan',
      workout_plan_title: '🏋️ Workout Plan',
      no_meals: 'No meals',
      no_exercises: 'No exercises',
      kcal_word: 'kcal',
      sets_reps: 'sets × ',
      reps_word: 'reps',
      assign_plan_title: 'Assign Plan',
      edit_plan_title: 'Edit Plan',
      goal_word: 'Goal',
      goal_placeholder: 'e.g. Weight Loss, Muscle Gain',
      workout_exercises_title: '🏋️ Workout Exercises',
      add_meal_btn: '+ Add Meal',
      add_exercise_btn: '+ Add Exercise',
      meal_name_placeholder: 'Meal name',
      exercise_placeholder: 'Exercise',
      sets_placeholder: 'Sets',
      reps_placeholder: 'Reps',
      delete_plan_title: 'Delete Plan',
      users_subtitle: 'Manage all system users and their roles',
      created_col: 'Created',
      inactive_status: 'Inactive',
      full_name_lbl: 'Full Name',
      min_6_chars: 'Min 6 characters',
      password_hint: 'User will use this password to log in.',
      disable_btn: 'Disable',
      enable_btn: 'Enable',
      disable_user_title: 'Disable User',
      enable_user_title: 'Enable User',
      email_in_use_msg: 'This email is already in use.',
      weak_password_msg: 'Password must be at least 6 characters.',
      user_created_success: 'User "{name}" created successfully!',
      user_disabled_msg: 'User disabled.',
      user_enabled_msg: 'User enabled.',
      gym_info_tab: 'Gym Info',
      currency_tab: 'Currency',
      whatsapp_tab: 'WhatsApp',
      gym_name_lbl: 'Gym Name',
      address_generic: 'Address',
      whatsapp_number_lbl: 'WhatsApp Number',
      dollar_rate_title: '💰 Dollar Rate',
      usd_to_lbp_rate_lbl: '1 USD = ? LBP',
      rate_hint: 'This rate is used throughout the app for LBP conversions.',
      save_rate_btn: '💾 Save Rate',
      rate_updated_msg: 'Rate updated: $1 = {rate} LBP',
      whatsapp_ultramsg_title: '💬 WhatsApp / UltraMsg',
      ultramsg_instance_lbl: 'UltraMsg Instance ID',
      ultramsg_token_lbl: 'UltraMsg Token',
      expiry_reminder_days_lbl: 'Expiry Reminder (days before)',
      restore_confirm_word: 'RESTORE',
      delete_confirm_word: 'DELETE',
      courses_revenue: 'Courses Revenue',
      active_courses_lbl: 'Active Courses',
      revenue_mix_title: '💼 Revenue Mix',
      courses_performance_title: '🎓 Courses Performance',
      courses_collected: 'Courses Collected',
      no_courses_data: 'No course data for this period',
      net_col: 'Net',
      failed_load_data: '⚠ Failed to load data',
      personal_information: 'Personal Information',
      select_placeholder: 'Select…',
      subscriber_name_placeholder: 'e.g. Sara Al-Hassan',
      emergency_contact: 'Emergency Contact',
      emergency_placeholder: 'Name – Phone',
      height_cm: 'Height (cm)',
      health_notes_placeholder: 'Health notes, goals…',
      subscriber_profile_title: 'Subscriber Profile',
      details_section: 'Details',
      height_weight_lbl: 'Height / Weight',
      subscription_history: 'Subscription History',
      no_coach_lbl: 'No coach',
      no_subscriptions_yet: 'No subscriptions yet.',
      tl_subscriber_created: 'Subscriber profile created',
      tl_subscriber_updated: 'Subscriber profile updated',
      tl_subscriber_deleted: 'Subscriber profile deleted',
      tl_new_subscription: 'New subscription',
      tl_subscription_updated: 'Subscription updated',
      tl_subscription_cancelled: 'Subscription cancelled',
      tl_payment_recorded: 'Payment recorded',
      activity_word: 'Activity',
      no_recorded_activity: 'No recorded activity yet for this subscriber.',
      failed_load_activity: 'Failed to load activity.',
      failed_load_profile: 'Failed to load profile.',
      delete_subscriber_title: 'Delete Subscriber',
      no_phone_number: 'No phone number',
      whatsapp_hello: 'Hello',
      whatsapp_default_msg: 'this is a message from Venus Gym. 🏋️',
      // Coaches section
      day_sun: 'Sun', day_mon: 'Mon', day_tue: 'Tue', day_wed: 'Wed', day_thu: 'Thu', day_fri: 'Fri', day_sat: 'Sat',
      daily_word: 'Daily',
      am_label: 'AM', pm_label: 'PM',
      monthly_base_salary: 'Monthly Base Salary (USD)',
      sport_specialties_schedule: 'Sport Specialties & Session Schedule',
      add_sport_specialty: '+ Add Sport Specialty',
      no_sports_assigned: 'No sports assigned',
      no_sports_assigned_yet_click: 'No sports assigned yet — click "Add Sport Specialty" below.',
      select_sport_placeholder: 'Select sport…',
      all_sports_assigned_warning: 'All available sports are already assigned.',
      delete_coach_title: 'Delete Coach',
      hello_from_venus: 'Hello from Venus Gym',
      // Sports section
      name_en: 'Name (EN)',
      name_ar: 'Name (AR)',
      icon_word: 'Icon',
      description_word: 'Description',
      delete_sport_title: 'Delete Sport',
      name_generic: 'Name',
      price_generic: 'Price',
      // Subscriptions section
      search_subscriber_or_sport: 'Search subscriber or sport…',
      link_subscriber_section: 'Link Subscriber',
      payment_section: 'Payment',
      subscriber_singular: 'Subscriber',
      type_name_to_search: 'Type a name to search…',
      months_word: 'Months',
      month_singular: 'Month',
      month_plural: 'Months',
      total_price_usd: 'Total Price (USD)',
      period_col: 'Period',
      pay_btn: 'Pay',
      optional_leave_blank_unpaid: '— optional, leave blank if unpaid',
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
      auto_renew_lbl: 'Auto-renew when it ends',
      auto_renew_hint: "Renews automatically for the same months at the sport's current monthly price (unpaid until collected).",
      auto_renew_already: 'Already renewed — turn auto-renew on the newer subscription instead.',
      auto_renew_badge: 'Auto',
      renewed_badge: 'Renewed',
      latest_word: 'Latest',
      select_page: 'Select all on this page',
      wa_nav: 'WhatsApp Sender',
      subs_settings_tab: 'Subscriptions',
      expiring_setting_title: '"Expiring Soon" window',
      expiring_setting_desc: 'How many days before its end date a subscription is marked "Expiring Soon". Used in Subscriptions, Subscribers, Reports and the Dashboard.',
      expiring_setting_example: 'With {n} days, a subscription ending on or before {date} shows as Expiring Soon.',
      expiring_setting_saved: 'Saved — "Expiring Soon" is now {n} days',
      frozen_word: 'Frozen', freeze_word: 'Freeze', unfreeze_word: 'Unfreeze',
      freeze_title: 'Freeze subscription', unfreeze_title: 'Unfreeze subscription',
      frozen_since: 'Frozen since', freeze_from: 'Freeze from', freeze_reason: 'Reason (optional)',
      freeze_reason_ph: 'Travel, injury, exams…',
      freeze_explain_1: 'It stops counting as active or expiring while frozen.',
      freeze_explain_2: 'Auto-renew is paused — it will not renew while frozen.',
      freeze_explain_3: 'When you unfreeze, the end date can be extended by the frozen days.',
      freeze_skipped: 'selected subscription(s) skipped (already frozen or already ended).',
      freeze_none_eligible: 'Nothing to freeze — only running, non-frozen subscriptions can be frozen.',
      unfreeze_none_eligible: 'None of the selected subscriptions are frozen.',
      unfreeze_extend: 'Extend the end date by the number of frozen days',
      frozen_done: 'subscription(s) frozen', unfrozen_done: 'subscription(s) unfrozen',
      auto_renew_paused_hint: 'Auto-renew is paused while this subscription is frozen.',
      tl_subscription_frozen: 'Subscription frozen', tl_subscription_unfrozen: 'Subscription unfrozen', extended_word: 'end date extended',
      ng_online: 'Online', ng_slow: 'Slow', ng_offline: 'Offline', ng_reconnecting: 'Reconnecting…',
      ng_status: 'Connection', ng_latency: 'Response time', ng_pending_ops: 'Waiting to save', ng_waiting_short: 'waiting',
      ng_q_good: 'Good', ng_q_fair: 'Fair', ng_q_poor: 'Poor',
      ng_banner_offline: 'No internet connection. Anything you save now is on hold and will be sent when the connection returns — keep the app open.',
      ng_banner_slow: 'Slow internet connection — saving and loading may take longer than usual.',
      ng_banner_pending: 'Saving is taking longer than usual because of the connection… please wait and don\'t click again.',
      ng_banner_loading: 'Data is loading slowly because of the connection…',
      ng_banner_stuck: 'The server isn\'t responding. Your last change may not be saved yet — try Reconnect.',
      ng_reconnect: 'Reconnect', ng_reload: 'Reload app',
      ng_back_online: 'Back online ✓', ng_reconnected: 'Connection restored ✓', ng_saved_late: 'Saved ✓ (the connection was slow)',
      ng_reconnect_failed: 'Still can\'t reach the server. Check the Wi-Fi / internet, then try Reconnect again.',
      ng_queued: 'You are offline — this change will be saved automatically when the connection returns. Keep the app open.',
      ng_reload_confirm_title: 'Unsaved changes',
      ng_reload_confirm_msg: '{n} change(s) are still waiting to be saved. Reloading now will lose them.',
      ng_reload_anyway: 'Reload anyway',
      reset_filters: 'Reset filters',
      owes_multi_filter: 'Owes 2+ fees',
      owes_total: 'Owes',
      unpaid_fees: 'unpaid fees',
      oldest_unpaid: 'Unpaid since',
      days_word: 'days',
      view_word: 'View',
      remind_word: 'Remind',
      settle_all: 'Settle all',
      settle_all_msg: 'Mark all {n} unpaid fees as fully paid?',
      debt_radar_title: 'Outstanding Balances',
      debt_radar_sub: 'Subscribers who owe more than one subscription fee',
      total_unpaid: 'Total unpaid',
      subscribers_owing: 'Subscribers owing',
      owe_2_plus: 'Owe 2+ fees',
      of_total_debt: 'of all unpaid',
      show_all_subs: 'Show all subscriptions',
      show_only_debtors: 'Show only their unpaid fees',
      show_less: 'Show less',
      show_all_word: 'Show all',
      no_multi_debtors: 'Nobody owes more than one fee. Nice!',
      selected_word: 'selected',
      bulk_change_start: 'Change start date',
      bulk_change_coach: 'Change coach',
      clear_selection: 'Clear selection',
      apply_to: 'Apply to',
      new_start_date: 'New start date',
      bulk_start_hint: "Each end date is recalculated from that subscription's own number of months. Prices and payments are not changed.",
      more_word: 'more',
      bulk_updated: 'subscription(s) updated',
      bulk_coach_hint: "The coach's current commission % is applied to every selected subscription.",
      bulk_coach_sport_warn: "selected subscription(s) are for a sport this coach doesn't teach.",
      bulk_delete_title: 'Delete subscriptions',
      bulk_delete_msg: 'Permanently delete {n} selected subscription(s)? This cannot be undone.',
      bulk_deleted: 'subscription(s) deleted',
      subs_short: 'subs',
      with_balance: 'with balance',
      show_word: 'Show',
      hide_word: 'Hide',
      expand_all: 'Expand all',
      collapse_all: 'Collapse all',
      auto_renewed_count: 'subscription(s) renewed automatically',
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
      unpaid: 'Unpaid',
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
      expiring_soon_lbl: 'Expiring Soon ({n} days)',
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
      sport_courses: 'الدورات الرياضية',
      new_course: 'دورة جديدة',
      course_search_placeholder: 'ابحث عن دورة، مكان، مدرب أو عضو…',
      all_status: 'كل الحالات',
      status_upcoming: 'قادمة',
      status_completed: 'منتهية',
      course_details: 'تفاصيل الدورة',
      course_name: 'اسم الدورة',
      place: 'المكان',
      price_per_member: 'السعر لكل عضو (دولار)',
      duration: 'المدة',
      duration_days: 'أيام',
      duration_weeks: 'أسابيع',
      duration_months: 'أشهر',
      duration_sessions: 'حصص',
      expected_revenue: 'الإيرادات المتوقعة',
      collected: 'المحصّل',
      coach_cost_expenses: 'تكلفة المدربين + المصاريف',
      net_profit: 'صافي الربح',
      manage: 'إدارة',
      member_singular: 'عضو',
      member_plural: 'أعضاء',
      coach_singular: 'مدرب',
      coach_plural: 'مدربين',
      tab_overview: 'نظرة عامة',
      tab_members: 'الأعضاء',
      tab_expenses: 'المصاريف',
      course_name_placeholder: 'مثال: معسكر سباحة صيفي',
      place_placeholder: 'مثال: المسبح الرئيسي',
      optional_add_later: '— اختياري، يمكن إضافته لاحقاً',
      add_expense_btn: '+ إضافة مصروف',
      select_coach_placeholder: 'اختر مدرباً…',
      select_coach_to_add: 'اختر مدرباً للإضافة…',
      all_coaches_assigned: 'تم تعيين جميع المدربين',
      cost: 'التكلفة',
      label: 'الوصف',
      amount: 'المبلغ',
      date: 'التاريخ',
      no_coaches_yet: 'لم يتم تعيين أي مدرب بعد',
      no_members_yet: 'لا يوجد أعضاء مسجلين بعد',
      no_expenses_yet: 'لا توجد مصاريف مسجلة بعد',
      no_coaches_added_create: 'لم تتم إضافة أي مدرب بعد.',
      no_expenses_added_create: 'لم تتم إضافة أي مصاريف بعد.',
      fee: 'الرسوم',
      member: 'العضو',
      status_lbl: 'الحالة',
      subscriber_tag: 'مشترك',
      guest_tag: 'ضيف',
      search_subscriber_or_type: 'ابحث عن مشترك أو اكتب اسماً جديداً…',
      phone_optional: 'الهاتف (اختياري)',
      pick_coach_first: 'اختر مدرباً أولاً',
      enter_name_or_pick: 'أدخل اسماً أو اختر مشتركاً',
      enter_expense_label: 'أدخل وصف المصروف',
      no_subscriber_match: 'لا يوجد مشترك مطابق — اضغط إضافة لتسجيله كضيف',
      record_payment_title: 'تسجيل الدفعة',
      confirm_payment_btn: '💰 تأكيد الدفع',
      confirm_payment_of: 'تأكيد دفع مبلغ',
      for_member: 'لـ',
      payment_recorded: 'تم تسجيل الدفعة!',
      remove_coach_title: 'إزالة المدرب',
      remove_member_title: 'إزالة العضو',
      remove_expense_title: 'إزالة المصروف',
      remove_btn: 'إزالة',
      delete_course_title: 'حذف الدورة',
      delete_course_btn: '🗑 حذف الدورة',
      close: 'إغلاق',
      course_word: 'دورة',
      courses_word: 'دورات',
      expense_label_placeholder: 'وصف المصروف (مثال: إيجار معدات)',
      // Subscribers section
      export_btn: 'تصدير',
      search_name_phone_sport: 'ابحث بالاسم أو الهاتف أو الرياضة…',
      all_sports: 'كل الرياضات',
      all_coaches: 'كل المدربين',
      all_payments: 'كل الدفعات',
      has_balance: 'عليه رصيد (غير مدفوع/جزئي)',
      no_subscription_lbl: 'بدون اشتراك',
      expires: 'تاريخ الانتهاء',
      no_matches: 'لا توجد نتائج',
      no_matching_subscribers: 'لا يوجد مشتركون مطابقون',
      session_time: 'وقت الحصة',
      no_recent_activity: 'لا يوجد نشاط حديث',
      renew_btn: 'تجديد',
      no_expiring_subscriptions: '🎉 لا توجد اشتراكات على وشك الانتهاء',
      ends_word: 'ينتهي في',
      pos_subtitle: 'بيع المنتجات لأعضاء النادي',
      search_products_placeholder: 'ابحث عن منتجات…',
      all_categories: 'كل الفئات',
      cat_water: 'مياه', cat_food: 'أطعمة', cat_supplement: 'مكملات غذائية', cat_gear: 'معدات', cat_apparel: 'ملابس', cat_other: 'أخرى',
      clear_btn: 'مسح',
      subtotal_usd: 'المجموع الفرعي (دولار)',
      subtotal_lbp: 'المجموع الفرعي (ل.ل)',
      customer_optional: 'الزبون (اختياري)',
      name_or_phone_placeholder: 'الاسم أو الهاتف',
      change_word: 'الباقي',
      sale_completed: 'تمت عملية البيع! 🎉',
      inventory_manager_title: '📦 إدارة المخزون',
      add_product_btn: '+ إضافة منتج',
      add_product_title: 'إضافة منتج',
      delete_product_title: 'حذف المنتج',
      reports_subtitle: 'نظرة مالية عامة وتحليلات',
      period_this_month: 'هذا الشهر',
      period_last_3_months: 'آخر 3 أشهر',
      period_this_year: 'هذه السنة',
      period_all_time: 'كل الأوقات',
      period_last_month: 'الشهر الماضي',
      period_last_6_months: 'آخر 6 أشهر',
      all_dates: 'كل التواريخ',
      custom_range: 'فترة مخصصة…',
      from_date: 'من',
      to_date: 'إلى',
      start_date_filter_hint: 'التصفية حسب تاريخ بدء الاشتراك',
      subscription_revenue: 'إيرادات الاشتراكات',
      pos_revenue: 'إيرادات نقطة البيع',
      total_revenue: 'إجمالي الإيرادات',
      revenue_by_sport: 'الإيرادات حسب الرياضة',
      all_time_word: 'كل الأوقات',
      coach_commissions: 'عمولات المدربين',
      course_costs_kpi: 'مدربو الدورات + المصاريف',
      total_outgoings: 'إجمالي المصروفات',
      total_net_profit: 'صافي الربح',
      due_this_period: 'مستحقة لهذه الفترة',
      subscribers_col: 'المشتركون',
      revenue_col: 'الإيرادات',
      commission_pct: 'نسبة العمولة %',
      commission_usd: 'العمولة $',
      no_coach_assignments: 'لا يوجد مدربون معينون',
      subscription_status_title: 'حالة الاشتراكات',
      pos_sales_summary: 'ملخص مبيعات نقطة البيع',
      total_transactions: 'إجمالي المعاملات',
      avg_per_sale: 'متوسط قيمة البيع',
      failed_load_reports: 'فشل تحميل التقارير.',
      diet_subtitle: 'تعيين خطط غذائية وتمارين للمشتركين',
      search_by_subscriber: 'ابحث باسم المشترك…',
      meal_plan_title: '🥗 الخطة الغذائية',
      workout_plan_title: '🏋️ خطة التمارين',
      no_meals: 'لا توجد وجبات',
      no_exercises: 'لا توجد تمارين',
      kcal_word: 'سعرة',
      sets_reps: 'مجموعة × ',
      reps_word: 'تكرار',
      assign_plan_title: 'تعيين خطة',
      edit_plan_title: 'تعديل الخطة',
      goal_word: 'الهدف',
      goal_placeholder: 'مثال: خسارة وزن، بناء عضلات',
      workout_exercises_title: '🏋️ تمارين اللياقة',
      add_meal_btn: '+ إضافة وجبة',
      add_exercise_btn: '+ إضافة تمرين',
      meal_name_placeholder: 'اسم الوجبة',
      exercise_placeholder: 'التمرين',
      sets_placeholder: 'مجموعات',
      reps_placeholder: 'تكرارات',
      delete_plan_title: 'حذف الخطة',
      users_subtitle: 'إدارة جميع مستخدمي النظام وأدوارهم',
      created_col: 'تاريخ الإنشاء',
      inactive_status: 'غير نشط',
      full_name_lbl: 'الاسم الكامل',
      min_6_chars: 'الحد الأدنى 6 أحرف',
      password_hint: 'سيستخدم المستخدم كلمة المرور هذه لتسجيل الدخول.',
      disable_btn: 'تعطيل',
      enable_btn: 'تفعيل',
      disable_user_title: 'تعطيل المستخدم',
      enable_user_title: 'تفعيل المستخدم',
      email_in_use_msg: 'هذا البريد الإلكتروني مستخدم بالفعل.',
      weak_password_msg: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.',
      user_created_success: 'تم إنشاء المستخدم "{name}" بنجاح!',
      user_disabled_msg: 'تم تعطيل المستخدم.',
      user_enabled_msg: 'تم تفعيل المستخدم.',
      gym_info_tab: 'معلومات النادي',
      currency_tab: 'العملة',
      whatsapp_tab: 'واتساب',
      gym_name_lbl: 'اسم النادي',
      address_generic: 'العنوان',
      whatsapp_number_lbl: 'رقم واتساب',
      dollar_rate_title: '💰 سعر الدولار',
      usd_to_lbp_rate_lbl: '1 دولار = ؟ ل.ل',
      rate_hint: 'يُستخدم هذا السعر في جميع أنحاء التطبيق لتحويلات الليرة اللبنانية.',
      save_rate_btn: '💾 حفظ السعر',
      rate_updated_msg: 'تم تحديث السعر: 1$ = {rate} ل.ل',
      whatsapp_ultramsg_title: '💬 واتساب / UltraMsg',
      ultramsg_instance_lbl: 'معرّف UltraMsg',
      ultramsg_token_lbl: 'رمز UltraMsg',
      expiry_reminder_days_lbl: 'تذكير الانتهاء (أيام قبل)',
      restore_confirm_word: 'استعادة',
      delete_confirm_word: 'حذف',
      courses_revenue: 'إيرادات الدورات',
      active_courses_lbl: 'الدورات النشطة',
      revenue_mix_title: '💼 توزيع الإيرادات',
      courses_performance_title: '🎓 أداء الدورات',
      courses_collected: 'محصّل الدورات',
      no_courses_data: 'لا توجد بيانات دورات لهذه الفترة',
      net_col: 'الصافي',
      failed_load_data: '⚠ فشل تحميل البيانات',
      personal_information: 'المعلومات الشخصية',
      select_placeholder: 'اختر…',
      subscriber_name_placeholder: 'مثال: سارة الحسن',
      emergency_contact: 'جهة اتصال للطوارئ',
      emergency_placeholder: 'الاسم – الهاتف',
      height_cm: 'الطول (سم)',
      health_notes_placeholder: 'ملاحظات صحية، أهداف…',
      subscriber_profile_title: 'الملف الشخصي للمشترك',
      details_section: 'التفاصيل',
      height_weight_lbl: 'الطول / الوزن',
      subscription_history: 'سجل الاشتراكات',
      no_coach_lbl: 'بدون مدرب',
      no_subscriptions_yet: 'لا توجد اشتراكات بعد.',
      tl_subscriber_created: 'تم إنشاء ملف المشترك',
      tl_subscriber_updated: 'تم تحديث ملف المشترك',
      tl_subscriber_deleted: 'تم حذف ملف المشترك',
      tl_new_subscription: 'اشتراك جديد',
      tl_subscription_updated: 'تم تحديث الاشتراك',
      tl_subscription_cancelled: 'تم إلغاء الاشتراك',
      tl_payment_recorded: 'تم تسجيل الدفعة',
      activity_word: 'نشاط',
      no_recorded_activity: 'لا يوجد نشاط مسجل بعد لهذا المشترك.',
      failed_load_activity: 'فشل تحميل النشاط.',
      failed_load_profile: 'فشل تحميل الملف الشخصي.',
      delete_subscriber_title: 'حذف المشترك',
      no_phone_number: 'لا يوجد رقم هاتف',
      whatsapp_hello: 'مرحباً',
      whatsapp_default_msg: 'هذه رسالة من نادي فينوس. 🏋️',
      // Coaches section
      day_sun: 'أحد', day_mon: 'إثنين', day_tue: 'ثلاثاء', day_wed: 'أربعاء', day_thu: 'خميس', day_fri: 'جمعة', day_sat: 'سبت',
      daily_word: 'يومياً',
      am_label: 'ص', pm_label: 'م',
      monthly_base_salary: 'الراتب الأساسي الشهري (دولار)',
      sport_specialties_schedule: 'التخصصات الرياضية وجدول الحصص',
      add_sport_specialty: '+ إضافة تخصص رياضي',
      no_sports_assigned: 'لا توجد رياضات معينة',
      no_sports_assigned_yet_click: 'لم يتم تعيين أي رياضة بعد — اضغط "إضافة تخصص رياضي" أدناه.',
      select_sport_placeholder: 'اختر رياضة…',
      all_sports_assigned_warning: 'تم تعيين جميع الرياضات المتاحة بالفعل.',
      delete_coach_title: 'حذف المدرب',
      hello_from_venus: 'مرحباً من نادي فينوس',
      // Sports section
      name_en: 'الاسم (إنجليزي)',
      name_ar: 'الاسم (عربي)',
      icon_word: 'الأيقونة',
      description_word: 'الوصف',
      delete_sport_title: 'حذف الرياضة',
      name_generic: 'الاسم',
      price_generic: 'السعر',
      // Subscriptions section
      search_subscriber_or_sport: 'ابحث عن مشترك أو رياضة…',
      link_subscriber_section: 'ربط مشترك',
      payment_section: 'الدفع',
      subscriber_singular: 'مشترك',
      type_name_to_search: 'اكتب اسماً للبحث…',
      months_word: 'الأشهر',
      month_singular: 'شهر',
      month_plural: 'أشهر',
      total_price_usd: 'السعر الإجمالي (دولار)',
      period_col: 'الفترة',
      pay_btn: 'ادفع',
      optional_leave_blank_unpaid: '— اختياري، اتركه فارغاً إذا لم يُدفع',
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
      auto_renew_lbl: 'تجديد تلقائي عند الانتهاء',
      auto_renew_hint: 'يتجدد تلقائياً لنفس عدد الأشهر بالسعر الشهري الحالي للرياضة (غير مدفوع حتى التحصيل).',
      auto_renew_already: 'تم تجديده مسبقاً — فعّل التجديد التلقائي على الاشتراك الأحدث.',
      auto_renew_badge: 'تلقائي',
      renewed_badge: 'مجدَّد',
      latest_word: 'الأحدث',
      select_page: 'تحديد الكل في هذه الصفحة',
      wa_nav: 'مرسل واتساب',
      subs_settings_tab: 'الاشتراكات',
      expiring_setting_title: 'مدة «ينتهي قريباً»',
      expiring_setting_desc: 'عدد الأيام قبل تاريخ الانتهاء التي يُعتبر فيها الاشتراك «ينتهي قريباً». تُستخدم في الاشتراكات والمشتركين والتقارير ولوحة التحكم.',
      expiring_setting_example: 'مع {n} أيام، الاشتراك الذي ينتهي في {date} أو قبله يظهر كـ «ينتهي قريباً».',
      expiring_setting_saved: 'تم الحفظ — «ينتهي قريباً» أصبحت {n} أيام',
      frozen_word: 'مجمّد', freeze_word: 'تجميد', unfreeze_word: 'إلغاء التجميد',
      freeze_title: 'تجميد الاشتراك', unfreeze_title: 'إلغاء تجميد الاشتراك',
      frozen_since: 'مجمّد منذ', freeze_from: 'التجميد من', freeze_reason: 'السبب (اختياري)',
      freeze_reason_ph: 'سفر، إصابة، امتحانات…',
      freeze_explain_1: 'لا يُحتسب فعّالاً أو قارب الانتهاء طوال فترة التجميد.',
      freeze_explain_2: 'يتوقف التجديد التلقائي — لن يتجدد أثناء التجميد.',
      freeze_explain_3: 'عند إلغاء التجميد يمكن تمديد تاريخ الانتهاء بعدد أيام التجميد.',
      freeze_skipped: 'اشتراك/اشتراكات محددة تم تخطيها (مجمّدة مسبقاً أو منتهية).',
      freeze_none_eligible: 'لا شيء للتجميد — يمكن تجميد الاشتراكات السارية وغير المجمّدة فقط.',
      unfreeze_none_eligible: 'لا يوجد اشتراك مجمّد ضمن التحديد.',
      unfreeze_extend: 'تمديد تاريخ الانتهاء بعدد أيام التجميد',
      frozen_done: 'اشتراك/اشتراكات تم تجميدها', unfrozen_done: 'اشتراك/اشتراكات تم إلغاء تجميدها',
      auto_renew_paused_hint: 'التجديد التلقائي متوقف طالما الاشتراك مجمّد.',
      tl_subscription_frozen: 'تم تجميد الاشتراك', tl_subscription_unfrozen: 'تم إلغاء تجميد الاشتراك', extended_word: 'تم تمديد تاريخ الانتهاء',
      ng_online: 'متصل', ng_slow: 'بطيء', ng_offline: 'غير متصل', ng_reconnecting: 'جارٍ إعادة الاتصال…',
      ng_status: 'الاتصال', ng_latency: 'زمن الاستجابة', ng_pending_ops: 'بانتظار الحفظ', ng_waiting_short: 'بانتظار',
      ng_q_good: 'جيد', ng_q_fair: 'مقبول', ng_q_poor: 'ضعيف',
      ng_banner_offline: 'لا يوجد اتصال بالإنترنت. أي شيء تحفظه الآن معلّق وسيُرسل عند عودة الاتصال — أبقِ التطبيق مفتوحاً.',
      ng_banner_slow: 'الإنترنت بطيء — قد يستغرق الحفظ والتحميل وقتاً أطول من المعتاد.',
      ng_banner_pending: 'الحفظ يستغرق وقتاً أطول بسبب الاتصال… يرجى الانتظار وعدم الضغط مرة أخرى.',
      ng_banner_loading: 'البيانات تُحمَّل ببطء بسبب الاتصال…',
      ng_banner_stuck: 'الخادم لا يستجيب. قد لا يكون آخر تعديل قد حُفظ بعد — جرّب إعادة الاتصال.',
      ng_reconnect: 'إعادة الاتصال', ng_reload: 'إعادة تحميل التطبيق',
      ng_back_online: 'عاد الاتصال ✓', ng_reconnected: 'تمت استعادة الاتصال ✓', ng_saved_late: 'تم الحفظ ✓ (كان الاتصال بطيئاً)',
      ng_reconnect_failed: 'لا يزال الخادم غير متاح. تحقق من الواي فاي / الإنترنت ثم أعد المحاولة.',
      ng_queued: 'أنت غير متصل — سيُحفظ هذا التعديل تلقائياً عند عودة الاتصال. أبقِ التطبيق مفتوحاً.',
      ng_reload_confirm_title: 'تعديلات غير محفوظة',
      ng_reload_confirm_msg: 'لا يزال {n} تعديل/تعديلات بانتظار الحفظ. إعادة التحميل الآن ستفقدها.',
      ng_reload_anyway: 'إعادة التحميل على أي حال',
      reset_filters: 'إعادة ضبط الفلاتر',
      owes_multi_filter: 'عليه رسمان أو أكثر',
      owes_total: 'المستحق',
      unpaid_fees: 'رسوم غير مدفوعة',
      oldest_unpaid: 'غير مدفوع منذ',
      days_word: 'يوم',
      view_word: 'عرض',
      remind_word: 'تذكير',
      settle_all: 'تسديد الكل',
      settle_all_msg: 'تسجيل جميع الرسوم غير المدفوعة ({n}) كمدفوعة بالكامل؟',
      debt_radar_title: 'الأرصدة المستحقة',
      debt_radar_sub: 'المشتركون المتأخرون بأكثر من رسم اشتراك',
      total_unpaid: 'إجمالي غير المدفوع',
      subscribers_owing: 'مشتركون عليهم رصيد',
      owe_2_plus: 'عليهم رسمان أو أكثر',
      of_total_debt: 'من إجمالي المستحق',
      show_all_subs: 'عرض كل الاشتراكات',
      show_only_debtors: 'عرض رسومهم غير المدفوعة فقط',
      show_less: 'عرض أقل',
      show_all_word: 'عرض الكل',
      no_multi_debtors: 'لا أحد عليه أكثر من رسم واحد. ممتاز!',
      selected_word: 'محدد',
      bulk_change_start: 'تغيير تاريخ البدء',
      bulk_change_coach: 'تغيير المدرب',
      clear_selection: 'إلغاء التحديد',
      apply_to: 'تطبيق على',
      new_start_date: 'تاريخ البدء الجديد',
      bulk_start_hint: 'يُعاد حساب تاريخ الانتهاء لكل اشتراك حسب عدد أشهره. لا تتغير الأسعار أو الدفعات.',
      more_word: 'أخرى',
      bulk_updated: 'اشتراك/اشتراكات تم تحديثها',
      bulk_coach_hint: 'تُطبَّق نسبة عمولة المدرب الحالية على كل الاشتراكات المحددة.',
      bulk_coach_sport_warn: 'من الاشتراكات المحددة لرياضة لا يدرّسها هذا المدرب.',
      bulk_delete_title: 'حذف الاشتراكات',
      bulk_delete_msg: 'حذف {n} اشتراك/اشتراكات محددة نهائياً؟ لا يمكن التراجع عن ذلك.',
      bulk_deleted: 'اشتراك/اشتراكات تم حذفها',
      subs_short: 'اشتراكات',
      with_balance: 'عليها رصيد',
      show_word: 'عرض',
      hide_word: 'إخفاء',
      expand_all: 'توسيع الكل',
      collapse_all: 'طي الكل',
      auto_renewed_count: 'اشتراك/اشتراكات تم تجديدها تلقائياً',
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
      unpaid: 'غير مدفوع',
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
      expiring_soon_lbl: 'ينتهي قريباً ({n} أيام)',
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
        { id: 'whatsapp',      icon: Icon.render('whatsapp'),      label: t('wa_nav'),       roles: ['super_admin','admin','receptionist'] },
      ]},
      { section: t('coaches') + ' & ' + t('sports'), items: [
        { id: 'coaches',       icon: Icon.render('coaches'),       label: t('coaches'),      roles: ['super_admin','admin'] },
        { id: 'sports',        icon: Icon.render('sports'),        label: t('sports'),       roles: ['super_admin','admin'] },
        { id: 'courses',       icon: Icon.render('courses'),       label: t('sport_courses'),roles: ['super_admin','admin','receptionist'] },
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
      courses:       () => CourseModule?.render(_db, _profile),
      pos:           () => POSModule?.render(_db, _profile),
      reports:       () => ReportsModule?.render(_db, _profile),
      whatsapp:      () => WaPage?.render(_db, _profile),
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
    // Long-polling fallback keeps Firestore working on weak / filtered connections
    // where the default streaming channel stalls (a common cause of a "frozen" app).
    try { _db.settings({ experimentalAutoDetectLongPolling: true, merge: true }); } catch (e) {}
    _auth = firebase.auth();
    if (typeof NetGuard !== 'undefined') NetGuard.init(_db);

    // Load dollar rate from settings
    try {
      const settingsDoc = await _db.collection(COL.SETTINGS).doc('global').get();
      if (settingsDoc.exists) {
        Currency.setRate(settingsDoc.data().dollarRate || 89500);
        AppSettings.apply(settingsDoc.data());
      }
    } catch(e) {}

    // Listen to auth state
    _auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        _user = firebaseUser;
        // settings may be readable only when signed in — refresh them now
        try {
          const sd = await _db.collection(COL.SETTINGS).doc('global').get();
          if (sd.exists) { Currency.setRate(sd.data().dollarRate || Currency.dollarRate); AppSettings.apply(sd.data()); }
        } catch (e) {}
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
    runAutoRenewals();
  }

  /* ── Auto-renew ended subscriptions (roles that can write subscriptions) ── */
  async function runAutoRenewals() {
    if (!_profile || !['super_admin', 'admin', 'receptionist'].includes(_profile.role)) return;
    if (typeof SubscriptionsModule === 'undefined' || !SubscriptionsModule.processAutoRenewals) return;
    try {
      const renewed = await SubscriptionsModule.processAutoRenewals(_db, true);
      if (renewed > 0) {
        Toast.info(`${renewed} ${t('auto_renewed_count')}`);
        if (_page !== 'subscriptions') navigate(_page); // refresh counts; the Subscriptions page reloads itself
      }
    } catch (e) {
      console.error('Auto-renew failed:', e);
    }
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
    get page()    { return _page; },
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