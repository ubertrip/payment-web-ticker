import axios from 'axios';
import moment from 'moment';

const csrfTokenURL = 'https://partners.uber.com/p3/fleet-manager/csrf-token';
const getPaymentsURL = 'https://partners.uber.com/p3/fleet-manager/_rpc?rpc=getCurrentStatementWithHistory';
const getDriverStatementSummaryURL = 'https://partners.uber.com/p3/fleet-manager/_rpc?rpc=getDriverStatementSummary';
const updateDelay = 1000 * 60;

const partnerSystemHost = process.env.TICKER_ENV === 'dev' ? 'http://localhost:4321/' : 'http://95.85.12.25:4321/';

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

      const notPaid = statements.filter(s => !s.isPaid);

      if (notPaid.length) {
        Promise.all(notPaid.map(np => getDriverStatementSummary(np.uuid))).then(result => {
          let paymentsPromises = [];

          result.forEach((r, i) => {
            if (r.data.status === "success") {
              const payments = r.data.data.payments;

              const preparedPayments = payments.map(p => ({
                paymentUuid: notPaid[i].uuid,
                driverUuid: p.driverUuid,
                cashCollected: p.cashCollected ? Math.abs(parseFloat(p.cashCollected)) : 0,
                incentives: p.incentives ? Math.abs(parseFloat(p.incentives)) : 0,
                miscPayment: p.miscPayment ? Math.abs(parseFloat(p.miscPayment)) : 0,
                netFares: p.netFares ? Math.abs(parseFloat(p.netFares)) : 0,
                netPayout: p.netPayout ? Math.abs(parseFloat(p.netPayout)) : 0,
              })).filter(p => p.netPayout);

              paymentsPromises.push(updatePayments(preparedPayments));

            } else {
              console.warn("Warning: ", r.data.status)
            }
          });

          const prepearedStatements = statements.map(s => ({
            uuid: s.uuid,
            total: s.total ? Math.abs(parseFloat(s.total)) : 0,
            startAt: s.startAt,
            endAt: s.endAt,
            isPaid: s.isPaid,
            currencyCode: s.currencyCode,
            timezone: s.timezone,
          }));

          paymentsPromises.push(updateStatements(prepearedStatements));

          Promise.all(paymentsPromises).then(() => {
            console.log('Updated ' + moment().format('DD.MM.YYYY hh:mm:ss'));
            setTimeout(() => update(), updateDelay);
          }).catch(() => {
            setTimeout(() => update(), updateDelay);
          });

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
  }).catch(() => {
    //TODO important, error handler
    setTimeout(() => update(), updateDelay)
  });
}

function updatePayments(payments) {
  return axios.post(partnerSystemHost + 'payments', payments);
}

function getDriverStatementSummary(statementUuid) {
  return axios.get(csrfTokenURL).then(({data}) => {
    return axios.post(getDriverStatementSummaryURL, {statementUuid, cursor: 0, limit: 50}, {
      headers: {
        'x-csrf-token': data,
      }
    });
  });
}

function updateStatements(statements) {
  return axios.post(partnerSystemHost + 'statements', statements);
}

function hearbeat() {
  return axios.get(partnerSystemHost);
}