'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

app.set('port', (process.env.PORT || 5000))

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// parse application/json
app.use(bodyParser.json())

// index
app.get('/', function (req, res) {
	res.send('hello world i am a secret bot')
})

// for facebook verification
app.get('/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
		res.send(req.query['hub.challenge'])
	} else {
		res.send('Error, wrong token')
	}
})

// to post data
app.post('/webhook/', function (req, res) {
	let messaging_events = req.body.entry[0].messaging
	for (let i = 0; i < messaging_events.length; i++) {
		let event = req.body.entry[0].messaging[i]
		let sender = event.sender.id
		if (event.message && event.message.text) {
			let text = event.message.text.toLowerCase().trim()
			//console.log(text)
			if (text.toLowerCase().substr(0,4) == 'wiki'){ 
				//search wiki 
				let searchterm = text.replace("wiki ","")
				//console.log(searchterm)
				sendWikiResults(searchterm,sender)
			}
			else{
				sendHelp(sender)
			}
		}
		if (event.postback && event.postback.payload) {
			let txt = formatmsg(event.postback.payload)
			sendTextMessage(sender, txt)
		}
	}
	// res.sendStatus(200)
})


// recommended to inject access tokens as environmental variables, e.g.
const token = process.env.FB_PAGE_ACCESS_TOKEN

function sendHelp(sender) {
	let messageData = { text:"Send wiki space 'search term' to search wikipedia" }
	
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

function sendWikiResults(query,sender) {

	const url = "https://graph.facebook.com/v2.6/me/messages?access_token="+token

	//save generic template format. Wiki page results to be pushed to elements array
	let genericTemplate = {
		recipient: {id: sender},
		message: {
			attachment:{
				type: "template",
				payload: {
					template_type: "generic",
					elements: []
				}
			}
		}
	}

	var options = {
		url: url,
		method: 'POST',
		body: genericTemplate,
		json: true
	}
	
	//send GET request to wiki API. body contains the json object from API

	const wikiUrl = 'https://en.wikipedia.org/w/api.php?format=json&action=query&generator=search&gsrnamespace=0&gsrlimit=10&prop=extracts&exintro&explaintext&exsentences=5&exlimit=max&gsrsearch='+query
	request(wikiUrl, function(error, response, body){
		if(error) {
			console.log(error)
		}
		try{
			body = JSON.parse(body)
			let pages = body.query.pages
			console.log(pages[0])
			for(let i = 0; i < pages.length; i++) {
				//Elements format - to push to elemebts array of Generic template 
					let myElement = {
						title: '',
						subtitle: '',
						buttons: [{
							"type": "postback",
							"title": "Read more",
							"payload": 'To be implemented'
						},
						{
							"type": "web_url",
							"url": '',
							"title": "View in browser"
						}]
					}
					myElement.title = pages[i].title
					myElement.subtitle = pages[i].extract.substr(0,80).trim()
					if(page.extract !== '') {
						myElement.buttons[0].payload = pages[i].extract.substr(0, 1000).trim()
					}
					myElement.buttons[1].url = "https://en.wikipedia.org/?curid=" + pages[i].pageid
					genericTemplate.message.attachment.payload.elements.push(myElement)		
			}
			options.body = genericTemplate
		}
		catch(err) {
			console.log('error: '+err)
			options = {
				uri: url,
				method: 'POST',
				json: {
					recipient: {id: sender},
					message: {
						"text": "Something went wrong, please try again."
					}
				}	
			}
		}
		//Post results to send API
		request(options, function(error, response, body) {
			if (error) {
				console.log('Error sending messages: ', error)
			} else if (response.body.error) {
				console.log('Error: ', response.body.error)
			}
		})
	})
}

//limit messages to 320 character limit
function formatmsg(msg){
    msg = msg.substr(0,320);
    if(msg.lastIndexOf(".") == -1) {
        return msg;
    }
    return msg.substr(0,msg.lastIndexOf(".")+1);
}

//normal text message
function sendTextMessage(sender, msg) {
	let messageData = { text:msg }
	
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

// spin spin sugar
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})
