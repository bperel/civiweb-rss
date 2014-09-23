var fs = require('fs');
var properties = [];
var jobs = [];
var rootUrl = 'https://www.civiweb.com/';

loadPropertiesFile('/home/civiweb-rss/civiweb.properties');

var loginFields = [
	{ name: 'ctl00$ContentPlaceHolderHeader$ctl00$m_txtUser', value: properties['username']},
	{ name: 'ctl00$ContentPlaceHolderHeader$ctl00$m_txtPass', value: properties['password']}
];

var page = require('webpage').create(),
	server = rootUrl+'/FR/index.aspx';

page.open(server, 'post', '', function (status) {
	if (status !== 'success') {
		console.log('Unable to login!');
	} else {
		login();
	}
});

function login() {
	page.onLoadFinished = function(){
		var hasLoggedIn = page.evaluate(function() {
			return !$('#ContentPlaceHolderHeader_ctl00_m_errorP.incorrect').length;
		});
		page.onLoadFinished = function() {};

		if (hasLoggedIn) {
			console.log('Logged in.');
			gotoJobList(1);
		}
		else {
			console.log('Wrong credentials or page structure has changed, exiting.');
			phantom.exit();
		}
	};

	page.evaluate(function(loginFields) {
		while (loginFields.length) {
			var field = loginFields.pop();
			$('[name="'+field.name+'"]').val(field.value);
		}
		$('#ContentPlaceHolderHeader_ctl00_m_lnkBtnCheckUser').trigger('click');
	}, loginFields);
	console.log('Logging in...');
}

function gotoJobList(pageNumber) {
	console.log('Fetching the job list : page '+pageNumber+'...');
	page.open(rootUrl+'/FR/mon-espace-perso/mes-offres/ma-liste-perso/Page/'+pageNumber+'.aspx', 'get', '', function (status) {
		if (status !== 'success') {
			console.log('Unable to get page '+pageNumber);
		} else {
			jobs = jobs.concat(page.evaluate(function() {
				var regexPublished = /^.* ([0-9]+)\/([0-9]+)\/([0-9]+)$/;

				var jobs = [];
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
				fs.write('jobs.json', JSON.stringify(jobs), 'w');
				fs.write('feed.xml', buildRss(), 'w');
				console.log('Done.');
				phantom.exit();
			}
		}
	});
}

function buildRss() {
	var rss =
		'<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0">'
		+ '<channel>'
			+ '<title>Civiweb</title>'
			+ '<link>https://www.civiweb.com</link>'
			+ '<description>Civiweb jobs</description>';

	while (jobs.length) {
		var job = jobs.shift();
		rss += '<item>'
					+ '<title><![CDATA[' + job.jobTitle + ']]></title>'
					+ '<description><![CDATA[' + job.jobDescription + ']]></description>'
					+ '<link>https://www.civiweb.com' + job.jobLink + '</link>'
					+ '<pubDate>' + job.jobPublicationDate.toUTCString() + '</pubDate>'
				+ '</item>';
	}

	rss += '</channel></rss>';

	console.log(rss);
	return rss;
}

function loadPropertiesFile(propertiesFile) {
	var propertiesArray = fs.read(propertiesFile).split('\n');
	while (propertiesArray.length) {
		var propertyData = propertiesArray.pop().split('=');
		properties[propertyData[0]] = propertyData[1];
	}
}