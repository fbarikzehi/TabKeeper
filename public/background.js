browser.runtime.onInstalled.addListener(() => {
  console.log('TabKeeper installed')
})

browser.runtime.onMessage.addListener((message) => {
  console.log('TabKeeper message', message)
  return Promise.resolve({ ok: true })
})
