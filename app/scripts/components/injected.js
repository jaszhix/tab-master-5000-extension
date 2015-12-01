var injected = `
var inject = function(e){ 
  chrome.runtime.sendMessage('${chrome.runtime.id}', 'active',function (r) {
    console.log(r)
    document.body.removeEventListener('click', inject);
  })
}
document.body.addEventListener('click', inject);
`;

export default injected;