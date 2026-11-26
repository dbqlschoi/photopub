// English / Korean text. The chosen language is remembered on this device.
const STR = {
  en: {
    loading: 'Loading…', loadingPhotos: 'Loading your photos…',
    navCal: 'Calendar', navStats: 'Stats', navPeople: 'People',
    addFirst: 'Add your first person', addFirstSub: 'Each person gets their own photo calendar.',
    addPerson: 'Add person', addChip: '＋ Add', screenshot: 'Save month as image',
    dayEmpty: n => `Add ${n}'s photos or videos for this day`, addPhotos: 'Add photos / videos', delPhoto: 'Delete this photo', delVideo: 'Delete this video',
    crop: 'Crop / resize', note: 'Note', notePh: 'Note...', noteSaved: 'Note saved',
    statsSub: 'Days with photos, last 6 months', photosTotal: n => `${n} photos in total`, statsEmpty: 'Add a person to see stats.',
    people: 'People', daysThisMonth: n => `${n} days this month ›`,
    signedIn: e => `Signed in as ${e}. Your photos are saved to your account and show on any device you sign in on.`,
    demo: 'Demo mode: Firebase isn\'t set up yet, so photos are saved on this device only.',
    signOut: 'Sign out', language: 'Language',
    editPerson: 'Edit person', name: 'Name', enterName: 'Enter a name', save: 'Save', delPerson: 'Delete person',
    delPersonQ: n => `Delete ${n}?`, delPersonText: n => `This removes ${n} and all of their photos. It can't be undone.`,
    del: 'Delete', cancel: 'Cancel', close: 'Close',
    delPhotoQ: 'Delete this item?', delPhotoText: 'It will be removed from this day.', photoDeleted: 'Deleted',
    adding: 'Adding photo…', addingVideo: 'Adding video…', addingN: (i, n) => `Adding ${i} of ${n}…`, added1: 'Added', addedN: n => `${n} items added`,
    addFail: 'Couldn\'t add a photo. Try again.', offline: 'Couldn\'t add a photo. Check that the phone has free space.',
    saveFail: 'Couldn\'t save on this phone. Check that it has free space.', permDenied: 'Not allowed to save. Check the Firestore rules.',
    loadFail: 'Couldn\'t load your photos.', slow: 'Taking a while to load. Check your connection.',
    appName: 'Collectbook', signInSub: 'Save a photo a day for the people you care about.',
    signInBtn: 'Sign in with Google', signInErr: 'Sign-in didn\'t work. Try again.',
    unauthorized: 'This web address isn\'t allowed yet. Add it in Firebase Authentication settings.',
    startFail: 'This browser can\'t save photos. Open the link in Chrome or Safari.',
    shotMaking: 'Making image…', shotSave: 'Save image', shotShare: 'Share', shotFail: 'Couldn\'t make the image. Try again.',
    shotSaved: 'Image saved to Downloads',
    cropFree: 'Free', cropCell: 'Calendar', rotate: 'Rotate', reset: 'Reset', cropSaved: 'Photo updated', cropFail: 'Couldn\'t update the photo. Try again.',
    saving: 'Saving…',
    installPopTitle: 'Install Collectbook', installPopText: 'Install the app to open it from your home screen and keep your photos safe.', installLater: 'Later', ok: 'OK',
    reorderHint: 'Press and hold a photo or video for 1 second, then drag to change the order.', reordered: 'Order changed',
    backupTitle: 'Backup',
    backupWhatQ: 'Choose what to back up.',
    backupAll: 'Photos and videos', backupPhotos: 'Photos only', restoringPct: n => `Restoring… ${n}%`,
    backupBtn: 'Back up', restoreBtn: 'Restore',
    lastBackup: d => `Last backup: ${d}`, neverBackup: 'Not backed up yet', usedSpace: s => `${s} used on this phone`,
    backupNote: 'Photos are saved only on this phone. Back up regularly and keep the file somewhere safe, like Google Drive.',
    backupMaking: 'Preparing backup…', backupProgress: (i, n) => `Preparing backup… ${i}/${n}`, backupFail: 'Couldn\'t make the backup. Try again.',
    backupReady: 'Backup ready', backupReadyText: s => `The backup file is ${s}. Save it, or share it to Google Drive, KakaoTalk or email to keep it safe.`,
    backupSave: 'Save file', backupShare: 'Share / send',
    restoreQ: 'Restore from a backup?', restoreText: 'Everything currently on this phone will be replaced by the backup file.',
    restoring: 'Restoring…', restored: 'Backup restored', restoreFail: 'That file isn\'t a Collectbook backup, or it couldn\'t be read.',
    installTitle: 'Install as an app', installBtn: 'Install app', installHow: 'How to install',
    iosSteps: ['Open this page in <b>Safari</b>.', 'Tap the <b>Share</b> button (square with an arrow).', 'Tap <b>Add to Home Screen</b>, then <b>Add</b>.', 'Open Collectbook from the new home screen icon.'],
    androidSteps: ['Open this page in <b>Chrome</b> or <b>Samsung Internet</b>.', 'Tap the <b>⋮</b> or <b>≡</b> menu.', 'Tap <b>Install app</b> or <b>Add to Home screen</b>.', 'Open Collectbook from the new home screen icon.'],
    iosTip: '📲 Add this app to your home screen to keep your photos safe. Tap to see how.',
    photoUnreadable: 'Couldn\'t open that photo. If it\'s stored in Google Photos, connect to the internet and try again.', photoFormat: 'This photo format isn\'t supported. Try a different photo.',
    live: 'Live Stream✔️', liveOff: 'Remove Live Stream', liveAdded: 'Marked as live stream', liveRemoved: 'Live stream removed',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    wk: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    wdFull: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    monthTitle: (y, m) => `${STR.en.months[m]} ${y}`,
    monthShort: m => STR.en.months[m],
    dayTitle: (y, m, d, wd) => `${STR.en.wdFull[wd]}, ${STR.en.months[m]} ${d}`
  },
  ko: {
    loading: '불러오는 중…', loadingPhotos: '사진을 불러오는 중…',
    navCal: '달력', navStats: '통계', navPeople: '사람',
    addFirst: '첫 번째 사람을 추가해주세요!', addFirstSub: '사람마다 각자의 사진 달력이 생깁니다.',
    addPerson: '사람 추가', addChip: '＋ 추가', screenshot: '이번 달 이미지로 저장',
    dayEmpty: n => `${n}의 이 날 사진·동영상 추가`, addPhotos: '사진·동영상 추가', delPhoto: '이 사진 삭제', delVideo: '이 동영상 삭제',
    crop: '자르기 / 크기 조절', note: '메모', notePh: '메모...', noteSaved: '메모가 저장되었습니다.',
    statsSub: '사진 있는 날, 최근 6개월', photosTotal: n => `총 사진 ${n}장`, statsEmpty: '사람을 추가하면 통계가 표시됩니다.',
    people: '사람', daysThisMonth: n => `이번 달 ${n}일 ›`,
    signedIn: e => `${e} 계정으로 로그인됨. 사진은 계정에 저장되어 로그인한 모든 기기에서 볼 수 있습니다.`,
    demo: '체험 모드: Firebase가 아직 설정되지 않아 사진이 이 기기에만 저장됩니다.',
    signOut: '로그아웃', language: '언어',
    editPerson: '사람 수정', name: '이름', enterName: '이름을 입력해 주십시오.', save: '저장', delPerson: '사람 삭제',
    delPersonQ: n => `${n}을(를) 삭제하시겠습니까?`, delPersonText: n => `${n}와(과) 모든 사진이 삭제됩니다. 되돌릴 수 없습니다.`,
    del: '삭제', cancel: '취소', close: '닫기',
    delPhotoQ: '이 항목을 삭제하시겠습니까?', delPhotoText: '해당 항목이 삭제됩니다.', photoDeleted: '삭제되었습니다.',
    adding: '사진 추가 중…', addingVideo: '동영상 추가 중…', addingN: (i, n) => `추가 중 (${i}/${n})…`, added1: '추가되었습니다.', addedN: n => `${n}개가 추가되었습니다.`,
    addFail: '사진을 추가하지 못했습니다. 다시 시도해 주십시오.', offline: '사진을 추가하지 못했습니다. 휴대폰 저장 공간을 확인해 주십시오.',
    saveFail: '이 휴대폰에 저장하지 못했습니다. 저장 공간을 확인해 주십시오.', permDenied: '저장 권한이 없습니다. Firestore 규칙을 확인해 주십시오.',
    loadFail: '사진을 불러오지 못했습니다.', slow: '불러오는 데 시간이 걸리고 있습니다. 인터넷 연결을 확인해 주십시오.',
    appName: 'Collectbook', signInSub: '소중한 사람들의 하루 한 장을 기록합니다.',
    signInBtn: 'Google로 로그인', signInErr: '로그인하지 못했습니다. 다시 시도해 주십시오.',
    unauthorized: '아직 허용되지 않은 주소입니다. Firebase 인증 설정에서 추가해 주십시오.',
    startFail: '이 브라우저에서는 사진을 저장할 수 없습니다. Chrome 또는 Safari에서 링크를 열어 주십시오.',
    shotMaking: '이미지 만드는 중…', shotSave: '이미지 저장', shotShare: '공유', shotFail: '이미지를 만들지 못했습니다. 다시 시도해 주십시오.',
    shotSaved: '다운로드 폴더에 저장되었습니다.',
    cropFree: '자유', cropCell: '달력 칸', rotate: '회전', reset: '초기화', cropSaved: '사진이 수정되었습니다.', cropFail: '사진을 수정하지 못했습니다. 다시 시도해 주십시오.',
    saving: '저장 중…',
    installPopTitle: 'Collectbook 앱 설치', installPopText: '홈 화면에서 바로 열 수 있고 사진을 안전하게 보관할 수 있도록 앱을 설치해 주십시오.', installLater: '나중에', ok: '확인',
    reorderHint: '사진이나 동영상을 1초 동안 길게 누른 후 끌어서 순서를 바꿀 수 있습니다.', reordered: '순서가 변경되었습니다.',
    backupTitle: '백업',
    backupWhatQ: '백업할 항목을 선택해주세요.',
    backupAll: '사진과 동영상', backupPhotos: '사진만', restoringPct: n => `복원하는 중… ${n}%`,
    backupBtn: '백업하기', restoreBtn: '복원하기',
    lastBackup: d => `마지막 백업: ${d}`, neverBackup: '아직 백업하지 않았습니다', usedSpace: s => `이 휴대폰에서 ${s} 사용 중`,
    backupNote: '사진은 이 휴대폰에만 저장됩니다. 정기적으로 백업하여 Google Drive 등 안전한 곳에 보관해 주십시오.',
    backupMaking: '백업을 준비하는 중…', backupProgress: (i, n) => `백업을 준비하는 중… ${i}/${n}`, backupFail: '백업하지 못했습니다. 다시 시도해 주십시오.',
    backupReady: '백업 준비 완료', backupReadyText: s => `백업 파일 크기는 ${s}입니다. 파일을 저장하거나 Google Drive, 카카오톡, 이메일로 공유하여 안전하게 보관해 주십시오.`,
    backupSave: '파일 저장', backupShare: '공유 / 보내기',
    restoreQ: '백업에서 복원하시겠습니까?', restoreText: '현재 이 휴대폰에 있는 모든 내용이 백업 파일의 내용으로 바뀝니다.',
    restoring: '복원하는 중…', restored: '백업이 복원되었습니다.', restoreFail: 'Collectbook 백업 파일이 아니거나 파일을 읽을 수 없습니다.',
    installTitle: '앱으로 설치', installBtn: '앱 설치', installHow: '설치 방법 보기',
    iosSteps: ['<b>Safari</b>에서 이 페이지를 엽니다.', '<b>공유</b> 버튼(화살표가 있는 네모)을 누릅니다.', '<b>홈 화면에 추가</b>를 누른 후 <b>추가</b>를 누릅니다.', '홈 화면에 생긴 Collectbook 아이콘으로 앱을 엽니다.'],
    androidSteps: ['<b>Chrome</b> 또는 <b>삼성 인터넷</b>에서 이 페이지를 엽니다.', '<b>⋮</b> 또는 <b>≡</b> 메뉴를 누릅니다.', '<b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 누릅니다.', '홈 화면에 생긴 Collectbook 아이콘으로 앱을 엽니다.'],
    iosTip: '📲 사진을 안전하게 보관하려면 이 앱을 홈 화면에 추가해 주십시오. 눌러서 방법을 확인하십시오.',
    photoUnreadable: '사진을 열 수 없습니다. Google 포토에 저장된 사진이라면 인터넷에 연결한 후 다시 시도해 주십시오.', photoFormat: '지원되지 않는 사진 형식입니다. 다른 사진을 선택해 주십시오.',
    live: '라이브✔️', liveOff: '라이브 취소', liveAdded: '라이브가 표시되었습니다.', liveRemoved: '라이브 표시가 취소되었습니다.',
    months: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    wk: ['월', '화', '수', '목', '금', '토', '일'],
    wdFull: ['일', '월', '화', '수', '목', '금', '토'],
    monthTitle: (y, m) => `${y}년 ${m + 1}월`,
    monthShort: m => `${m + 1}월`,
    dayTitle: (y, m, d, wd) => `${m + 1}월 ${d}일 (${STR.ko.wdFull[wd]})`
  }
};

function initial() {
  try { const v = localStorage.getItem('lang'); if (v === 'en' || v === 'ko') return v; } catch (e) {}
  return (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en';
}
let lang = initial();
document.documentElement.lang = lang;

export const getLang = () => lang;
export function setLang(l) {
  lang = l;
  document.documentElement.lang = l;
  try { localStorage.setItem('lang', l); } catch (e) {}
}
export const t = (key, ...args) => {
  const v = STR[lang][key] ?? STR.en[key];
  return typeof v === 'function' ? v(...args) : v;
};
