Expanded = function(e, t)
{
  e.style.maxWidth = "100%"
  e.style.display = ""
  t.removeAttribute("data-expanding")
  t.style.display = "none"
  t.style.opacity = ""
}

Expand = function(e)
{
  e.setAttribute("data-expanding", true)
  t = document.createElement("img")
  t.setAttribute("src", e.parentNode.getAttribute("href"))
  t.style.display = "none"
  e.parentNode.insertBefore(t, e.nextElementSibling)
  e.style.opacity = "0.75"
  setTimeout(Expanded, 15, t, e)
}

Contract = function(e)
{
  t = (a = e.parentNode).parentNode.parentNode
  a.firstChild.style.display = ""
  a.removeChild(e)
  a.offsetTop<window.pageYOffset&&a.scrollIntoView({top:0, behavior:"smooth"})
}

Expander = function(e)
{
  if(e.target.parentNode.classList.contains("fileThumb"))
  {
    e.preventDefault();
    if(e.target.hasAttribute("data-src"))
    {Expand(e.target);} else {Contract(e.target);}
  }
}

document.addEventListener("click",Expander);
