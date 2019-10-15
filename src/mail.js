const sgMail = require("@sendgrid/mail");

// const transport = nodemailer.createTransport({
//   host: process.env.MAIL_HOST,
//   port: process.env.MAIL_PORT,
//   auth: {
//     user: process.env.MAIL_USER,
//     pass: process.env.MAIL_PASSWORD
//   }
// })

const sendAnEmail = async ({ email, html, text }) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: { email },
    from: "info@victoryselect.com",
    subject: "Sending with Twilio SendGrid is Fun",
    text: "and easy to do anywhere, even with Node.js",
    html: "<strong>and easy to do anywhere, even with Node.js</strong>"
  };
  sgMail.send(msg);
};

const sendMail = async msg => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  res = await sgMail.send(msg);
};

const sendResetMail = ({ email, name, url }) => {
  const msg = {
    from: {
      email: "brian@bbaker.net",
      name: "Victory Select"
    },
    reply_to: {
      email: "info@victoryselect.com",
      name: "Victory Select"
    },
    personalizations: [
      {
        to: [
          {
            email: email
          }
        ],
        dynamic_template_data: {
          name: name,
          url: url
        },
        subject: "Reset your password"
      }
    ],
    template_id: "d-025df4ee89e4452889bfea7f1f2a173a"
  };
  sendMail(msg);
};

const makeANiceEmail = text => `
  <div className="email" style="
    border: 1px solid black;
    padding: 20px;
    font-family: sans-serif;
    line-height: 2;
    font-size: 20px;
  ">
    <h2>Hello There!</h2>
    <p>${text}</p>
    <p>😘, Brian Baker</p>
  </div>
`;

// exports.transport = transport
module.exports = { sendResetMail };
