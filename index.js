import express from "express";
import bodyParser from "body-parser";
import Dotenv from "dotenv";
import axios from 'axios'
Dotenv.config();

const { TOKEN, SERVER_URL } = process.env

const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`

const uri = `/webhook/${TOKEN}`

const WEBHOOK_URI = SERVER_URL + uri

const app = express()
app.use(bodyParser.json())


function init() {

    axios.get(`${TELEGRAM_API}/setWebhook?url=${WEBHOOK_URI}`).then(res => console.log(res.data)).catch(err => console.log(err));

}

async function send_message(chat_id, text) {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
        "chat_id": chat_id,
        "text": text
    }).then(res => {
        console.log(res.statusText)
        return true;
    }).catch(err => console.log(err));

    // callback()

}


var session_count = 0;

function search_slots(pincode, refreshIntervalId, chat_id, days) {

    if (days < 0) {

        if (session_count == 0) {
            send_message(chat_id, 'sorry I can\'t find any vaccination centre in your area 😞😞')
            clearInterval(refreshIntervalId)
        }

        session_count = 0;

        return;


    }

    var currentDate = new Date();

    //for(var i=0;i<7;i++){

    currentDate.setDate(currentDate.getDate() + days);
    var month = (currentDate.getMonth() + 1).toString()
    if (month.length == 1) month = '0' + month
    var date = currentDate.getDate().toLocaleString()
    if (date.length == 1) date = '0' + date
    //console.log(date)


    var string_date = `${date}-${month}-${currentDate.getFullYear().toString()}`

    console.log(string_date)

    axios.get(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/findByPin?pincode=${pincode}&date=${string_date}`).then(resp => {
        var count = 0;
        const vaccine_centres = resp.data.sessions
        console.log(resp.statusText);

        session_count += vaccine_centres.length

        if (vaccine_centres.length == 0) {

            search_slots(pincode, refreshIntervalId, chat_id, days - 1)
            session_count = 0
            return;

            // send_message(chat_id, 'sorry I can\'t find any vaccination centre in your area 😞😞')
            // clearInterval(refreshIntervalId)

        }
        else {

            for (var i = 0; i < vaccine_centres.length; i++) {
                if (vaccine_centres[i].available_capacity_dose1)
                    count += vaccine_centres[i].available_capacity_dose1;
                if (vaccine_centres[i].available_capacity_dose2)
                    count += vaccine_centres[i].available_capacity_dose2;

            }
            //   console.log(count)
            if (count == 0) {

                search_slots(pincode, refreshIntervalId, chat_id, days - 1)

            }
            else {

                send_message(chat_id, "slots are available now")

                session_count = 0;

                clearInterval(refreshIntervalId)

                return;

            }
        }


    })



}


app.listen(process.env.PORT || 5000, () => {
    console.log("app running at port 5000")
    init()
})

app.get("/", (req, res) => {
    res.send("Hallow world");
})

app.post(uri, (req, res) => {
    console.log(req.body.message.text)

    res.send()

    var chat_id = req.body.message.chat.id;
    var text = req.body.message.text;
    if (text == '/start') {
        const ans = "Hay there I am covid vaccine slot tracker 😊 \nenter your pincode to begin with 👇👇"
        send_message(chat_id, ans)
    }
    else if (!isNaN(text)) {

        if (text.length != 6) send_message(chat_id, "incorrect pincode")

        else {
            send_message(chat_id, "processing your request").then(() => send_message(chat_id, 'please wait 🔃 🔃').then(() => send_message(chat_id, 'we will inform you once the slots are avsilable')))
            // send_message(chat_id, "please wait")
            // send_message(chat_id, "we will inform you once the slots are avsilable")

            //var slot = false

            var refreshIntervalId = setInterval(() => {
                console.log("interval function is called")
                search_slots(text, refreshIntervalId, chat_id, 4)
            }, 1000 * 60);


        }


    }
    else {

        send_message(chat_id, "type /start to start conversation")

    }

})



