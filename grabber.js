var fs = require('fs');
var propertiesArray = fs.read('/home/civiweb-rss/civiweb.properties').split('\n');
var properties = [];
var jobs = [];

while (propertiesArray.length) {
	var propertyData = propertiesArray.pop().split('=');
	properties[propertyData[0]] = propertyData[1];
}

var fields = {
	'ctl00$ContentPlaceHolderHeader$ctl00$m_txtUser' : properties['username'],
	'ctl00$ContentPlaceHolderHeader$ctl00$m_txtPass' : properties['password']
};

var fieldStrings = [];
for (var i in fields) {
	fieldStrings.push(i+'='+fields[i]);
}

var page = require('webpage').create(),
	server = 'https://www.civiweb.com/FR/index.aspx';

page.open(server, 'post', '', function (status) {
	if (status !== 'success') {
		console.log('Unable to post!');
	} else {
		login();
	}
});

function login() {
	page.onLoadFinished = function(){
		console.log('Logged in.');
		gotoJobList(1);
		page.onLoadFinished = function() {};
	};
	page.evaluate(function(fields) {
		for (var fieldName in fields) {
			$('[name="'+fieldName+'"]').val(fields[fieldName]);
		}
		$('#ContentPlaceHolderHeader_ctl00_m_lnkBtnCheckUser').trigger('click');
	}, fields);
	console.log('Logging in...');
}

function gotoJobList(pageNumber) {
	console.log('Fetching the job list : page '+pageNumber+'...');
	page.open('https://www.civiweb.com/FR/mon-espace-perso/mes-offres/ma-liste-perso/Page/'+pageNumber+'.aspx', 'get', '', function (status) {
		if (status !== 'success') {
			console.log('Unable to get page '+pageNumber);
		} else {
			jobs = jobs.concat(page.evaluate(function() {
				var regexPublished = /^.* ([0-9]+)\/([0-9]+)\/([0-9]+)$/;

				var jobs = [];debugger;
				$.each($('h2'), function() {
					var link = $(this).find('a');
					var linkUrl = link.attr('href');
					var jobTitle = link.text();
					var jobDetailsElement = $(this).closest('tr').nextAll('tr:has(td.gch.last)').eq(0).find('td.gch.last');
					var jobDescription = jobDetailsElement.find('p').text();
					var jobPublicationDateParts = jobDetailsElement.find('h3 time').text().match(regexPublished);
					var jobPublicationDate = new Date(jobPublicationDateParts[3], jobPublicationDateParts[2] - 1, jobPublicationDateParts[1]);
					jobs.push({jobLink: linkUrl, jobTitle: jobTitle, jobPublicationDate: jobPublicationDate, jobDescription: jobDescription});
				});
				return jobs;
			}));

			pageNumber++;

			var hasNextPage = page.evaluate(function(pageNumber) {
				return $('.pagination span a[href$="'+pageNumber+'.aspx"]').length;
			}, pageNumber);

			if (hasNextPage) {
				gotoJobList(pageNumber);
			}
			else {
				console.log('No more pages, building RSS feed...');
				fs.write('/var/www/ci/civiweb-rss/jobs.json', JSON.stringify(jobs), 'w');
				fs.write('/var/www/ci/civiweb-rss/feed.xml', buildRss(), 'w');
				console.log('Done.');
				phantom.exit();
			}
		}
	});
}

function buildRss() {
	var rss = '<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0">';
	rss += '<channel><title>Civiweb</title><link>https://www.civiweb.com</link><description>Civiweb jobs</description>';

	while (jobs.length) {
		var job = jobs.shift();
		var jobRss =
			'<item>'
		  + '<title><![CDATA[' + job.jobTitle + ']]></title>'
		  + '<description><![CDATA[' + job.jobDescription + ']]></description>'
		  + '<link>https://www.civiweb.com' + job.jobLink + '</link>'
		  + '<pubDate>' + job.jobPublicationDate.toUTCString() + '</pubDate>'
		  +'</item>';

		rss += jobRss;
	}

	rss += '</channel></rss>';

	console.log(rss);
	return rss;
}

/**
 * Wait until the test condition is true or a timeout occurs. Useful for waiting
 * on a server response or for a ui change (fadeIn, etc.) to occur.
 *
 * @param testFx javascript condition that evaluates to a boolean,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param onReady what to do when testFx condition is fulfilled,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param timeOutMillis the max amount of time to wait. If not specified, 3 sec is used.
 */
function waitFor(testFx, onReady, timeOutMillis) {

	var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 3000, //< Default Max Timout is 3s
		start = new Date().getTime(),
		condition = false;
	var a = setInterval(function() {
		if ( (new Date().getTime() - start < maxtimeOutMillis) && !condition ) {
			// If not time-out yet and condition not yet fulfilled
			console.log('check = false aa='+a);
			condition = (typeof(testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
		} else {
			if(!condition) {
				// If condition still not fulfilled (timeout but condition is 'false')
				console.log("'waitFor()' timeout");
				phantom.exit(1);
			} else {
				// Condition fulfilled (timeout and/or condition is 'true')
				console.log("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
				clearInterval(a); //< Stop this interval
				a = undefined;
				typeof(onReady) === "string" ? eval(onReady) : onReady(); //< Do what it's supposed to do once the condition is fulfilled
			}
		}
	}, 250); //< repeat check every 250ms
}