civiweb-rss
===========

Generates an RSS feed containing the latest Civiweb job offers related to your account

## Requirements

PhantomJS must be globally accessible

# Configuration

Create a properties file containing your Civiweb credentials. The file should be in the form :

```
username=<Civiweb username>
password=<Civiweb password>
```

Make this file readable and note its location. The default location is /home/civiweb-rss/civiweb.properties .

In grabber.js, edit the location and name of the properties file to be loaded.

## Usage

```
phantomjs grabber.js
```

This will create a file named feed.xml containing the latest Civiweb job offers corresponding to your search criteria on the website.

You can create a Jenkins job executing this command a couple of times per day to make the RSS feed up-to-date
