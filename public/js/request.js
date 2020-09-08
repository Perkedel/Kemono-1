document.getElementById('specific_id').style.display = 'none';
function handleClick (radio) {
  if (radio.value === 'specific') {
    document.getElementById('specific_id').style.display = 'block';
  } else {
    document.getElementById('specific_id').style.display = 'none';
  }
}
