import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
const r = await resend.emails.send({
  from: 'GlowBuddy <hello@knowbeforeyouglow.com>',
  to: ‘juliapilk’@gmail.com,
  subject: 'GlowBuddy email test',
  html: '<h1>It works</h1>'
});
console.log(r);
