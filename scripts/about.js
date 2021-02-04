window.onload = (event) => {
	var year = new Date().getFullYear()
	document.getElementById("age").innerHTML = (year - 2003);
	document.getElementById("codingtime").innerHTML = (year - 2019);
};