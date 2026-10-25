// EB Garamond (opening lines, pull quotes, blurbs, letters). Its own <link>: the
// author page's shared 'author-fonts' stylesheet doesn't include it.
export function injectGaramond() {
  if (document.getElementById('garamond-font')) return
  const link = document.createElement('link')
  link.id = 'garamond-font'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap'
  document.head.appendChild(link)
}
