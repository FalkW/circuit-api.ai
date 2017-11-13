'use strict';

// load configuration
var config = require('./config.json');

console.log(config);

// logger
var bunyan = require('bunyan');

//remove Markdown
var removeMd = require('remove-markdown');

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
//* Circuit-Dialogflow-Adapter
//*********************************************************************
var CircuitDialogFlowAdapter = function () {

    var self = this;
    var client = null;

    //*********************************************************************
    //* Circuit - logonBot
    //*********************************************************************
    this.logon = function logon() {
        logger.info('[APP]: logon');
        return new Promise(function (resolve, reject) {
            logger.info('[APP]: createClient');
            client = new Circuit.Client({
                client_id: config.client_id,
                client_secret: config.client_secret,
                domain: config.domain,
                autoRenewToken: true
            });
            self.addEventListeners(client); //register evt listeners
            client.logon()
                .then(function loggedOn(user) {
                    logger.info('[APP]: loggedOn', user);
                    return client.setPresence({state: Circuit.Enums.PresenceState.AVAILABLE});
                })
                .then(user => {
                    console.log('Presence updated', user);
                    resolve();
                })
                .catch(reject);
        });
    };
    //*********************************************************************
    //* Circuit - addEventListeners
    //*********************************************************************
    this.addEventListeners = function addEventListeners(client) {
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
            self.checkifbotneedstoreact(evt);
        });
        client.addEventListener('itemUpdated', function (evt) {
            self.logEvent(evt);
            self.checkifbotneedstoreact(evt);
        });
    };

    //*********************************************************************
    //* Circuit - logEvent -- helper
    //*********************************************************************
    this.logEvent = function logEvent(evt) {
        logger.info('[APP]:', evt.type, 'event received');
        logger.debug('[APP]:', util.inspect(evt, { showHidden: true, depth: null }));
    };

    //*********************************************************************
    //* notsentByMe -- helper
    //*********************************************************************
    this.notsentByMe = function notsentByMe(item) {
        return (client.loggedOnUser.userId !== item.creatorId);
    };

    //*********************************************************************
    //* Check if the Bot needs to react -- helper
    //*********************************************************************
    this.checkifbotneedstoreact = function (evt) {
        if (!evt.item || !evt.item.text || !evt.item.text.content) {
            return ;
        }
        //Check if user was mentioned
        if (evt.item.text.content.includes('span class="mention"') && evt.item.text.content.includes(`@${client.loggedOnUser.displayName}`)) {
            logger.info('[APP]: MENTION DETECTED');
            self.processEvent(evt);
        } else {
            //Check if direct conversation
            client.getConversationById(evt.item.convId)
                .then(conversation => {
                    logger.info(`[APP]: CONVERSATION TYPE: ${conversation.type} DETECTED`);
                    if (conversation.type === 'DIRECT' && self.notsentByMe(evt.item)) {
                        self.processEvent(evt);
                    } else {
                        logger.info('[APP]: NOTHING TO DO');
                    }
                })
            ;
        }
    };

    //*************************************************************************************
    //* Circuit - Retrieve Data from Mentions or Direct Conversations and send it to API.ai
    //*************************************************************************************
    this.processEvent = function (evt) {
    //Clean up request - remove markdown and mentioning of bot user
        var removestring = `@${client.loggedOnUser.displayName} `;
        var userquestion = removeMd(evt.item.text.content);
        userquestion = userquestion.replace(RegExp(removestring, 'g'), '');
        logger.debug(`[APP]: CLEANUP RESULT: ${userquestion}`);

        //Verify that the request has less than 256 characters which is the max value for API.ai
        if (userquestion.length <= 256) {
            logger.info(`[APP]: REQUEST LENGTH CHECK PASSED: ${userquestion.length} CHARACTERS`);
            //Send Data to API AI after removing clutter aka markdown
            self.analyzeData(userquestion, evt.item.parentItemId || evt.item.itemId, evt.item.convId);
        } else {
            logger.info(`[APP]: ERROR REQUEST LENGTH CHECK FAILED: ${userquestion.length} CHARACTERS`);
            self.postAnswer(`Unfortunately I do not understand questions having more than 265 characters and your request has ${userquestion.length}`, evt.item.parentItemId || evt.item.itemId, evt.item.convId);
        }
    };

    //*********************************************************************
    //* Send Data to Dialogflow and return result
    //*********************************************************************
    this.analyzeData = async function (content, sesID, conID) {
        var app = apiai(config.apiai_token);

        logger.info(`[API AI] REQUEST CONTENT: ${content} SessionID: ${sesID}`);

        var options = {
            sessionId: sesID
        };

        var request = app.textRequest(content, options);
<<<<<<< HEAD
=======
    
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
>>>>>>> 6094b426cd07ee44147f932d4019a6d186a4bcdb

        request.on('response', function (response) {
            //Check if Answer has a suitable quality
            if (response.result.score > 0) {
            //Score > 0 post result to Circuit
                self.postAnswer(response.result.fulfillment.speech, sesID, conID);

                //Add additional capabilities based on actions defined by Dialogflow
                switch (response.result.action) {
                    //case 'invite_user':
                    //self.postAnswer('ACTION: '+ response.result.action + '\nMAIL-ADDRESSES: ' + response.result.parameters.email, sesID, conID);
                    //    self.invite_user(response.result.parameters.email, conID, sesID);
                    //    break;
                    //case 'remove_user':
                    //self.postAnswer('ACTION: '+ response.result.action + '\nMAIL-ADDRESSES: ' + response.result.parameters.email, sesID, conID);
                    //    self.remove_user(response.result.parameters.email, conID, sesID);
                    //    break;
                    default:
                        logger.info('[API AI] RESPONSE No action detected.');
                }

            } else {
            //Score = 0 post excuse to Circuit
                self.postAnswer('404 Bot confused!', sesID, conID);
            }
        });

        request.on('error', function (err) {
            logger.info(`[API AI] ERROR: ${err}`);
        });

        request.end();
    };

    //*********************************************************************
    //* Circuit - Post Reply
    //*********************************************************************
    this.postAnswer = async function (text, parentid, conversationID) {
        logger.info('[APP]: SEND MESSAGE: ', text, parentid, conversationID);
        var message = {
            content: text,
            parentId: parentid
        };
        return client.addTextItem(conversationID, message);
    };
};


//*********************************************************************
//* run
//*********************************************************************
function run() {

    var circuitDialogFlowAdapter = new CircuitDialogFlowAdapter();

    circuitDialogFlowAdapter.logon()
        .catch(function (e) {
            logger.error('[APP]:', e);
        })
    ;
}

//******************************************************************
//* main
//*********************************************************************
run();
