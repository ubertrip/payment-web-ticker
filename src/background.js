import axios from 'axios';
import moment from 'moment';

const csrfTokenURL = 'https://partners.uber.com/p3/fleet-manager/csrf-token';
const getPaymentsURL = 'https://partners.uber.com/p3/fleet-manager/_rpc?rpc=getCurrentStatementWithHistory';
const updateDelay = 5000;

hearbeat().then(({data: {status, result}}) => {
  if (status === 'ok') {
    console.log('Hearbeat: ', result.name);
    update();
  }
});

function update() {
  axios.get(csrfTokenURL).then(({data}) => {
    axios.post(getPaymentsURL, null, {
        headers: {
          'x-csrf-token': data,
        }
      }
    ).then(({data: {data: {payments, statements}}}) => {

      const notPaid = statements.find(s => !s.isPaid);

      if (notPaid) {
        const preparedPayments = payments.map(p => ({
          paymentUuid: notPaid.uuid,
          driverUuid: p.driverUuid,
          cashCollected: p.cashCollected ? Math.abs(parseFloat(p.cashCollected)) : 0,
          incentives: p.incentives ? Math.abs(parseFloat(p.incentives)) : 0,
          miscPayment: p.miscPayment ? Math.abs(parseFloat(p.miscPayment)) : 0,
          netFares: p.netFares ? Math.abs(parseFloat(p.netFares)) : 0,
          netPayout: p.netPayout ? Math.abs(parseFloat(p.netPayout)) : 0,
        })).filter(p => p.cashCollected);

        updatePayments(preparedPayments).then(() => {
          console.log('Updated ' + moment().format('DD.MM.YYYY hh:mm:ss'));
          setTimeout(() => update(), updateDelay);
        }).catch(() => {
          setTimeout(() => update(), updateDelay);
        });
      } else {
        console.warn('Not found not paid statements');
      }
    }).catch(() => {
      //TODO important, error handler
      setTimeout(() => update(), updateDelay)
    });
  });
}

function updatePayments(payments) {
  return axios.post('http://localhost:4321/payments', payments);
}

function hearbeat() {
  return axios.get('http://localhost:4321');
}