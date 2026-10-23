/**
 * Voyaro Verification Suite: Documents Title Sizing, *(for all trips) Scope, and 5-Doc Quota Limit
 */

const fs = require('fs');
const assert = require('assert');

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`         ${err.message}`);
  }
}

console.log('================================================================');
console.log(' Voyaro: Documents All-Trips & Account Quota Verification Suite');
console.log('================================================================\n');

// 1. Title Typography & Visual Alignment
console.log('--- 1. Title Font Size & Typography ---');
const documentsScreen = fs.readFileSync('src/app/(tabs)/documents/index.tsx', 'utf8');

it('tripTitle uses adjusted font size 18 and semiBold', () => {
  assert(documentsScreen.includes('fontSize: 18,'));
  assert(documentsScreen.includes('fontFamily: fontFamily.semiBold,'));
  assert(!documentsScreen.includes('fontSize: 22,'));
});

it('tripSelectorArrow has adjusted size and alignment', () => {
  assert(documentsScreen.includes('fontSize: 9,'));
});

// 2. *(for all trips) Universal Documents
console.log('\n--- 2. *(for all trips) Universal Documents ---');
const mappersFile = fs.readFileSync('src/services/mappers.ts', 'utf8');
const docServiceFile = fs.readFileSync('src/services/documentService.ts', 'utf8');
const hookFile = fs.readFileSync('src/hooks/useTripDocuments.ts', 'utf8');
const modalFile = fs.readFileSync('src/components/documents/UploadDocumentModal.tsx', 'utf8');
const cardFile = fs.readFileSync('src/components/documents/DocumentCard.tsx', 'utf8');

it('Defines ALL_TRIPS_PREFIX in mappers for backend-safe universal tagging', () => {
  assert(mappersFile.includes("ALL_TRIPS_PREFIX = '[All Trips] '"));
  assert(mappersFile.includes('isForAllTrips'));
});

it('Exports listUniversalDocuments and MAX_FREE_ACCOUNT_DOCUMENTS from documentService', () => {
  assert(docServiceFile.includes('export const MAX_FREE_ACCOUNT_DOCUMENTS = 5;'));
  assert(docServiceFile.includes('export async function listUniversalDocuments()'));
  assert(docServiceFile.includes('export async function getUserDocumentCount()'));
});

it('UploadDocumentModal contains Set for all trips *(for all trips) toggle', () => {
  assert(modalFile.includes('Set for all trips'));
  assert(modalFile.includes('*(for all trips)'));
  assert(modalFile.includes('isForAllTrips'));
});

it('DocumentCard renders *(for all trips) badge when document.isForAllTrips is true', () => {
  assert(cardFile.includes('document.isForAllTrips'));
  assert(cardFile.includes('allTripsBadge'));
  assert(cardFile.includes('*(for all trips)'));
});

it('Documents screen dropdown includes *(for all trips) option at top', () => {
  assert(documentsScreen.includes('ALL_TRIPS_SCOPE_ID'));
  assert(documentsScreen.includes('*(for all trips)'));
});

it('useTripDocuments merges universal documents across trips', () => {
  assert(hookFile.includes('listUniversalDocuments'));
  assert(hookFile.includes('isAllTripsScope'));
});

// 3. 5-Document Account Limit & Subscription Page Interception
console.log('\n--- 3. 5-Document Account Limit & Subscription Redirection ---');

it('Document service rejects uploads exceeding 5 documents on account', () => {
  assert(docServiceFile.includes('currentCount >= MAX_FREE_ACCOUNT_DOCUMENTS'));
  assert(docServiceFile.includes('Document limit reached'));
  assert(docServiceFile.includes('Upgrade to Voyaro Pro'));
});

it('Documents screen checks quota and prompts with link to subscription page', () => {
  assert(documentsScreen.includes('userDocCount >= MAX_FREE_ACCOUNT_DOCUMENTS'));
  assert(documentsScreen.includes('/(tabs)/profile/subscription'));
});

it('Vault banner displays live account quota feedback', () => {
  assert(documentsScreen.includes('quotaBadge'));
  assert(documentsScreen.includes('/5 Docs'));
});

const tripDetailDocs = fs.readFileSync('src/app/(tabs)/trips/[tripId]/documents.tsx', 'utf8');

it('Trip detail documents screen also checks 5-document quota before opening upload modal', () => {
  assert(tripDetailDocs.includes('count >= MAX_FREE_ACCOUNT_DOCUMENTS'));
  assert(tripDetailDocs.includes('/(tabs)/profile/subscription'));
});

console.log('\n================================================================');
console.log(` RESULTS: ${passedTests} / ${totalTests} Tests Passed`);
console.log(` STATUS: ${passedTests === totalTests ? 'ALL VERIFICATIONS PASSED' : 'FAILURES DETECTED'}`);
console.log('================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
