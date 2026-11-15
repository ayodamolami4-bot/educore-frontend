/**
 * Route registry — all 34 admin screens from the design handoff (AD01–AD34),
 * with their official titles. Built screens render directly; the rest resolve
 * to PlaceholderScreen until the team builds them (same pattern, one at a time).
 */
import AdminHomeView from './AdminHomeView';
import StudentListView from './StudentListView';
import StudentProfileView from './StudentProfileView';
import GuardianListView from './GuardianListView';
import GuardianProfileView from './GuardianProfileView';
import TeacherListView from './TeacherListView';
import TeacherProfileView from './TeacherProfileView';
import TeacherFormView from './TeacherFormView';
import AdminSettingsView from './AdminSettingsView';
import FeePlansView from './FeePlansView';
import AcademicStructureView from './AcademicStructureView';
import ClassWorkspaceView from './ClassWorkspaceView';
import TimetableBuilderView from './TimetableBuilderView';
import TimetablePublishView from './TimetablePublishView';
import RegisterReviewView from './RegisterReviewView';
import AssessmentRulesView from './AssessmentRulesView';
import StudentFormView from './StudentFormView';
import InvoiceListView from './InvoiceListView';
import InvoiceDetailView from './InvoiceDetailView';
import NoticesView from './NoticesView';
import ImportsExportsView from './ImportsExportsView';
import CalendarView from './CalendarView';
import AttendanceOverviewView from './AttendanceOverviewView';
import ResultsReviewView from './ResultsReviewView';
import ReportsView from './ReportsView';
import PromotionPreviewView from './PromotionPreviewView';
import PromotionApproveView from './PromotionApproveView';
import AuditTrailView from './AuditTrailView';
import PaymentsBoardView from './PaymentsBoardView';
import PaymentDetailView from './PaymentDetailView';
import MessageInboxView from './MessageInboxView';
import ConversationView from './ConversationView';
import ComplaintsListView from './ComplaintsListView';
import ComplaintDetailView from './ComplaintDetailView';
import PlaceholderScreen from './PlaceholderScreen';

export const ADMIN_SCREENS = {
  AD01: { name: 'AdminHome', title: 'Admin home', Component: AdminHomeView, tab: 'Home' },
  AD02: { name: 'StudentList', title: 'Student list', Component: StudentListView, tab: 'Students' },
  AD03: {
    name: 'StudentForm',
    title: 'Register or edit a student',
    Component: StudentFormView,
    tab: 'Students',
  },
  AD04: {
    name: 'StudentProfile',
    title: 'Student profile',
    Component: StudentProfileView,
    tab: 'Students',
  },
  AD05: {
    name: 'GuardianList',
    title: 'Parents and guardians list',
    Component: GuardianListView,
    tab: 'More',
  },
  AD06: {
    name: 'GuardianProfile',
    title: 'Guardian profile and child links',
    Component: GuardianProfileView,
    tab: 'More',
  },
  AD07: {
    name: 'TeacherList',
    title: 'Teachers list',
    Component: TeacherListView,
    tab: 'More',
  },
  AD08: {
    name: 'TeacherForm',
    title: 'Register or edit a teacher',
    Component: TeacherFormView,
    tab: 'More',
  },
  AD09: {
    name: 'TeacherProfile',
    title: 'Teacher profile and responsibilities',
    Component: TeacherProfileView,
    tab: 'More',
  },
  AD10: {
    name: 'SchoolSettings',
    title: 'School settings and admin access',
    Component: AdminSettingsView,
    tab: 'More',
  },
  AD11: {
    name: 'Calendar',
    title: 'School calendar and daily times',
    Component: CalendarView,
    tab: 'Academics',
  },
  AD12: {
    name: 'AcademicStructure',
    title: 'Classes, subjects and departments',
    Component: AcademicStructureView,
    tab: 'Academics',
  },
  AD13: {
    name: 'ClassWorkspace',
    title: 'One class and its student list',
    Component: ClassWorkspaceView,
    tab: 'Academics',
  },
  AD14: {
    name: 'TimetableBuilder',
    title: 'Build the weekly timetable',
    Component: TimetableBuilderView,
    tab: 'Academics',
  },
  AD15: {
    name: 'TimetablePublish',
    title: 'Review and publish the timetable',
    Component: TimetablePublishView,
    tab: 'Academics',
  },
  AD16: {
    name: 'AttendanceOverview',
    title: 'Attendance and absence follow-up',
    Component: AttendanceOverviewView,
    tab: 'Academics',
  },
  AD17: {
    name: 'RegisterReview',
    title: 'View or correct a class register',
    Component: RegisterReviewView,
    tab: 'Academics',
  },
  AD18: {
    name: 'AssessmentRules',
    title: 'Set exams and grading rules',
    Component: AssessmentRulesView,
    tab: 'Academics',
  },
  AD19: {
    name: 'ResultsReview',
    title: 'Review and publish results',
    Component: ResultsReviewView,
    tab: 'Academics',
  },
  AD20: { name: 'Reports', title: 'Reports', Component: ReportsView, tab: 'Academics' },
  AD21: {
    name: 'FeePlans',
    title: 'Set fees and issue bills',
    Component: FeePlansView,
    tab: 'Fees',
  },
  AD22: { name: 'InvoiceList', title: 'Student invoices', Component: InvoiceListView, tab: 'Fees' },
  AD23: {
    name: 'InvoiceDetail',
    title: 'Invoice detail and office payment',
    Component: InvoiceDetailView,
    tab: 'Fees',
  },
  AD24: {
    name: 'PaymentsBoard',
    title: 'Payments and money checks',
    Component: PaymentsBoardView,
    tab: 'Fees',
  },
  AD25: {
    name: 'PaymentDetail',
    title: 'Payment detail and refund review',
    Component: PaymentDetailView,
    tab: 'Fees',
  },
  AD26: {
    name: 'PromotionPreview',
    title: 'Preview promotion or completion',
    Component: PromotionPreviewView,
    tab: 'More',
  },
  AD27: {
    name: 'PromotionApprove',
    title: 'Approve promotion and graduation',
    Component: PromotionApproveView,
    tab: 'Academics',
  },
  AD28: { name: 'Notices', title: 'School announcements', Component: NoticesView, tab: 'More' },
  AD29: {
    name: 'MessageInbox',
    title: 'School messages',
    Component: MessageInboxView,
    tab: 'More',
  },
  AD30: {
    name: 'Conversation',
    title: 'One private conversation',
    Component: ConversationView,
    tab: 'More',
  },
  AD31: {
    name: 'ComplaintsList',
    title: 'Complaints list',
    Component: ComplaintsListView,
    tab: 'More',
  },
  AD32: {
    name: 'ComplaintDetail',
    title: 'Complaint details and resolution',
    Component: ComplaintDetailView,
    tab: 'More',
  },
  AD33: {
    name: 'ImportsExports',
    title: 'Bring in or download school data',
    Component: ImportsExportsView,
    tab: 'More',
  },
  AD34: {
    name: 'AuditTrail',
    title: 'School change history',
    Component: AuditTrailView,
    tab: 'More',
  },
};

/**
 * Resolve a registry entry to a renderable screen component. Built screens
 * render directly; the rest get a PlaceholderScreen with the recipe.
 */
export function screenComponent(adCode) {
  const entry = ADMIN_SCREENS[adCode];
  if (!entry) return undefined;
  if (entry.Component) return entry.Component;
  return function AdPlaceholder() {
    return <PlaceholderScreen adCode={adCode} title={entry.title} />;
  };
}
