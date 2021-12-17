function animateValue(id, start, end, duration) {
    var obj = document.getElementById(id);
    var range = end - start;
    var minTimer = 50;
    var stepTime = Math.abs(Math.floor(duration / range));
    stepTime = Math.max(stepTime, minTimer);
    var startTime = new Date().getTime();
    var endTime = startTime + duration;
    var timer;
    function run() {
        var now = new Date().getTime();
        var remaining = Math.max((endTime - now) / duration, 0);
        var value = Math.round(end - (remaining * range));
        obj.innerHTML = value;
        if (value == end) {
            clearInterval(timer);
        }
    }
    timer = setInterval(run, stepTime);
    run();
}

let me_Url = 'https://api.github.com/users/4rlenrey';
let repos_Url = 'https://api.github.com/users/4rlenrey/repos';
let me_request = new XMLHttpRequest();
let repos_request = new XMLHttpRequest();

me_request.open('GET', me_Url);
me_request.responseType = 'json';
me_request.send();

var number_of_repos = 0;

me_request.onload = function () {
	const my_request_response = me_request.response;
	var number_of_followers = my_request_response["followers"];
	animateValue("followers_count", 0, number_of_followers, 5000);
	number_of_repos = my_request_response["public_repos"];
}

repos_request.open('GET', repos_Url);
repos_request.responseType = 'json';
repos_request.send();

repos_request.onload = function () {
	const my_request_response = repos_request.response;
	var number_of_stars = 0;
	for(let x = 0; x < number_of_repos; x++)
	number_of_stars += my_request_response[x]["stargazers_count"];
	animateValue("stars_count", 0, number_of_stars, 5000);
}
