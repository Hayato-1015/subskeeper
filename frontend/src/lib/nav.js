// ログイン前の画面移動（トップ ⇄ #login）。App は hashchange で画面を切り替える

function notify() {
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

// トップページから #login へ。履歴に「トップから来た」印を付ける
export function goToLogin(e) {
  e?.preventDefault()
  window.history.pushState({ fromLanding: true }, '', '#login')
  notify()
}

// #login からトップへ。トップから来たなら履歴を戻り（端末の戻ると同じ）、
// 直接開かれた場合はサイトの外へ出ないようにトップのアドレスに置き換える
export function leaveLogin(e) {
  e?.preventDefault()
  if (window.history.state?.fromLanding) {
    window.history.back()
  } else {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    notify()
  }
}
