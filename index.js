'use strict';

// load configuration
var config = require('./config.json');

console.log(config);

// logger
var bunyan = require('bunyan');

//remove Markdown
const removeMd = require('remove-markdown');

// node utils
var util = require('util');

// SDK logger
var sdkLogger = bunyan.createLogger({
    name: 'sdk',
    stream: process.stdout,
    level: config.sdkLogLevel
});

// Application logger
var logger = bunyan.createLogger({
    name: 'app',
    stream: process.stdout,
    level: 'debug'
});

// Circuit SDK
logger.info('[APP]: get Circuit instance');
var Circuit = require('circuit-sdk');

logger.info('[APP]: Circuit set bunyan logger');
Circuit.setLogger(sdkLogger);

// API.AI SDK
logger.info('[APP]: get API.AI instance');
var apiai = require('apiai');



//*********************************************************************
//* Circuit-API.ai Adapter
//*********************************************************************
var CircuitapiaoBot = function(){

    var self = this;
    var client = null;

    //*********************************************************************
    //* Circuit - logonBot
    //*********************************************************************
    this.logon = function logon(){
        logger.info('[APP]: logon');
        return new Promise( function (resolve, reject) {
            logger.info('[APP]: createClient');
            client = new Circuit.Client({
                client_id: config.client_id,
                client_secret: config.client_secret,
                domain: config.domain,
                autoRenewToken: true
            });
            self.addEventListeners(client);  //register evt listeners
            client.logon()
            .then(function loggedOn(user) {
                logger.info('[APP]: loggedOn', user);
                return client.setPresence({state: Circuit.Enums.PresenceState.AVAILABLE});
            })
            .then(() => {
                console.log('Presence updated');
                resolve();
            })
            .catch(reject);
        });
    };
    
    
    //*********************************************************************
    //* Circuit - addEventListeners
    //*********************************************************************
    this.addEventListeners = function addEventListeners(client){
        logger.info('[APP]: addEventListeners');
        //set event callbacks for this client
        client.addEventListener('connectionStateChanged', function (evt) {
            self.logEvent(evt);
        });
        client.addEventListener('registrationStateChanged', function (evt) {
            self.logEvent(evt);
        });
        client.addEventListener('reconnectFailed', function (evt) {
            self.logEvent(evt);
        });
        client.addEventListener('itemAdded', function (evt) {
            self.logEvent(evt);
            self.processEvent(evt)});
        client.addEventListener('itemUpdated', function (evt) {
            self.logEvent(evt);
            self.processEvent(evt)});
    };

           
    //*********************************************************************
    //* Circuit - logEvent -- helper
    //*********************************************************************
    this.logEvent = function logEvent(evt){
        logger.info('[APP]:', evt.type, 'event received');
        logger.debug('[APP]:', util.inspect(evt, { showHidden: true, depth: null }));
    };

    //*********************************************************************
    //* Circuit - Retrieve Data from Mentions
    //*********************************************************************
    this.processEvent = function (evt) {
        if ( ! evt.item || ! evt.item.text || ! evt.item.text.content )
           return ;
        //Check if message is directed directly to the Bot in order to be able to use him also in group conversations
        if ( evt.item.text.content.includes('span class="mention"') && evt.item.text.content.includes("@"+client.loggedOnUser.displayName) ) {
            logger.info('[APP]:MENTION DETECTED');
            logger.debug('[APP]:RETRIEVED CONV ID :'+evt.item.convId);
            logger.debug('[APP]:RETRIEVED TEXT :'+evt.item.text.content);
            logger.debug('[APP]:RETRIEVED ItemID :'+evt.item.itemId);                     

            //Clean up request
            var removestring = "@"+client.loggedOnUser.displayName
            var userquestion = removeMd(evt.item.text.content)
            userquestion = userquestion.replace(RegExp(removestring, 'g'),'');
            logger.debug('[APP]:CLEANUP RESULT: '+userquestion);                     
            

            //Verify that the request has less than 256 characters which is the max value for API.ai
            if (userquestion.length <= 256) {
                logger.info('[APP]: REQUEST LENGTH CHECK PASSED: ' + userquestion.length + ' CHARACTERS');                     
                //Send Data to API AI after removing clutter aka markdown
                self.aicrunching(userquestion, evt.item.parentItemId || evt.item.itemId, evt.item.convId);
            } else {
                logger.info('[APP]: ERROR REQUEST LENGTH CHECK FAILED: ' + userquestion.length + ' CHARACTERS');                     
                self.postAnswer('Unfortunately I do not understand questions having more than 265 characters and your request has ' + userquestion.length, evt.item.parentItemId || evt.item.itemId, evt.item.convId);                
            }
            
        }
     }

    //*********************************************************************
    //* Circuit - Post Reply
    //*********************************************************************
    this.postAnswer = function (text, parentid, conversationID) {
        logger.debug('[APP]: postAnswer', text, parentid, conversationID);
        var message = {
            content: text,
            parentId: parentid
            };
        return client.addTextItem(conversationID, message);
    }

    //*********************************************************************
    //* Send Data to API.AI and return result - API.AI
    //*********************************************************************
    this.aicrunching = function (content, sesID, conID) {
        var app = apiai(config.apiai_token);
    
        logger.debug('[API AI] REQUEST CONTENT --> '+ content + ' SessionID --> '+ sesID);

        var options = {
            sessionId: sesID
        };
        
        var request = app.textRequest(content, options);
    
        request.on('response', function(response) {
        logger.debug('[API AI] RESPONSE: '+ JSON.stringify(response));
        logger.debug('[API AI] RESPONSE Object.keys(response): '+ Object.keys(response)); 
        logger.debug('[API AI] RESPONSE Object.keys(response.result): '+ (Object.keys(response.result)));            
        
        //Check if Answer has a suitable quality
        if (response.result.score > 0) {
            //Score > 0 post result to Circuit
            self.postAnswer(response.result.fulfillment.speech, sesID, conID);
        } else {
            //Score = 0 post excuse to Circuit
            self.postAnswer('Unfortunately I have no answer for you.', sesID, conID);
        }

        

        });
    
        request.on('error', function(error) {
        logger.info('[API AI] ERROR to log: '+ error);
        });
    
        request.end();
    }
}


//*********************************************************************
//* run
//*********************************************************************
function run() {

    var circuitapiaoBot = new CircuitapiaoBot();

    circuitapiaoBot.logon()
        .catch (function(e){
            logger.error('[APP]:', e);
        });
}

//******************************************************************
//* main
//*********************************************************************
run();
