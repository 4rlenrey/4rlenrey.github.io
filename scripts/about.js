window.onload = (event) => {
	var year = new Date().getFullYear()
	document.getElementById("age").innerHTML = (year - 2003);
	document.getElementById("codingtime").innerHTML = (year - 2019);

	let arr = document.getElementsByClassName("logg")


	for (let step = 0; step < 17; step++) {
		arr[step].addEventListener("mouseover", function g() {
			document.getElementById("dos").innerHTML = arr[step].getAttribute('id');;
		});
	}
};


function onhovr(name) {
	document.getElementById("dos").innerHTML = name;
}

