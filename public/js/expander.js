Expand = function(c, t)
{
  if(!c.naturalWidth)
  {return setTimeout(Expand, 10, c, t);}
  c.style.maxWidth = "100%"
  c.style.display = ""
  t.style.display = "none"
  t.style.opacity = ""
}

Expander = function(e)
{
  t = e.target;
  if(t.parentNode.classList.contains("fileThumb"))
  {
    e.preventDefault();
    if(t.hasAttribute("data-src"))
    {
      c = document.createElement("img")
      c.setAttribute("src", t.parentNode.getAttribute("href"))
      c.style.display = "none"
      t.parentNode.insertBefore(c, t.nextElementSibling)
      t.style.opacity = "0.75"
      setTimeout(Expand, 10, c, t)
    } else {
      t.parentNode.firstChild.style.display = ""
      t.parentNode.removeChild(t)
    }
  }
}

document.addEventListener("click", Expander);
