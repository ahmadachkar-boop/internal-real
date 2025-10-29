/**
 * Debug script to check push notification configuration
 * Run with: node debug-push-notifications.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./functions/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugPushNotifications() {
  console.log('\n🔍 DEBUGGING PUSH NOTIFICATION SETUP\n');
  console.log('=' .repeat(60));

  try {
    // 1. Check fcmTokens collection
    console.log('\n1️⃣  Checking fcmTokens collection...');
    const tokensSnapshot = await db.collection('fcmTokens').get();

    if (tokensSnapshot.empty) {
      console.log('❌ No tokens found in fcmTokens collection');
    } else {
      console.log(`✅ Found ${tokensSnapshot.size} token(s):`);
      tokensSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - User ${doc.id}:`);
        console.log(`     Token: ${data.token ? data.token.substring(0, 30) + '...' : 'MISSING'}`);
        console.log(`     Platform: ${data.platform || 'MISSING'}`);
        console.log(`     Updated: ${data.updatedAt ? new Date(data.updatedAt.toDate()).toISOString() : 'MISSING'}`);
      });
    }

    // 2. Check recent couchMessages
    console.log('\n2️⃣  Checking recent couchMessages...');
    const messagesSnapshot = await db.collection('couchMessages')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();

    if (messagesSnapshot.empty) {
      console.log('❌ No messages found in couchMessages collection');
    } else {
      console.log(`✅ Found ${messagesSnapshot.size} recent message(s):`);
      messagesSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - Message ${doc.id}:`);
        console.log(`     Sender: ${data.sender}`);
        console.log(`     Car: ${data.carNumber}`);
        console.log(`     NDR: ${data.ndrId}`);
        console.log(`     Message: ${data.message ? data.message.substring(0, 50) : 'N/A'}...`);
      });
    }

    // 3. Check NDR assignments
    console.log('\n3️⃣  Checking NDR assignments...');
    const ndrsSnapshot = await db.collection('ndrs')
      .orderBy('date', 'desc')
      .limit(3)
      .get();

    if (ndrsSnapshot.empty) {
      console.log('❌ No NDRs found');
    } else {
      console.log(`✅ Found ${ndrsSnapshot.size} recent NDR(s):`);
      ndrsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - NDR ${doc.id}:`);
        console.log(`     Date: ${data.date}`);
        const assignments = data.assignments || {};
        const carAssignments = assignments.cars || {};
        console.log(`     Car Assignments:`, carAssignments);
      });
    }

    // 4. Test token validity
    console.log('\n4️⃣  Testing FCM token validity...');
    const tokensTest = await db.collection('fcmTokens').get();

    if (!tokensTest.empty) {
      const testToken = tokensTest.docs[0].data().token;
      const testUserId = tokensTest.docs[0].id;

      if (testToken) {
        console.log(`   Testing token for user ${testUserId}...`);
        try {
          const message = {
            notification: {
              title: 'Debug Test',
              body: 'Testing FCM token validity'
            },
            token: testToken,
            apns: {
              payload: {
                aps: {
                  sound: 'default'
                }
              }
            }
          };

          const response = await admin.messaging().send(message);
          console.log(`   ✅ Token is VALID! Message ID: ${response}`);
        } catch (error) {
          console.log(`   ❌ Token is INVALID or EXPIRED!`);
          console.log(`   Error: ${error.code} - ${error.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Debug complete!\n');

  } catch (error) {
    console.error('\n❌ Debug error:', error);
  }
}

debugPushNotifications();