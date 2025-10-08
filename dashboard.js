// dashboard.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// === Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyDBCalxCVKnVERmpLnnCjT0X9Basy3uw7o",
  authDomain: "reparify-4db99.firebaseapp.com",
  projectId: "reparify-4db99",
  storageBucket: "reparify-4db99.appspot.com",
  messagingSenderId: "1039139563247",
  appId: "1:1039139563247:web:b93c63206f03433de11d1a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);

let currentUserId = null;
let shopData = null;
let activeJobs = {};

// === AUTH & SHOP DATA ===
onAuthStateChanged(auth, async user => {
  if (user) {
    currentUserId = user.uid;
    try {
      const snap = await getDoc(doc(db, "shops", currentUserId));
      if (!snap.exists() || !snap.data().isApproved) {
        alert("Shop not found or not approved.");
        await signOut(auth);
        window.location.href = "login.html";
        return;
      }
      shopData = snap.data();
      document.getElementById("unlockShopName").innerText = shopData.shopName || "";
      document.getElementById("unlockShopAddress").innerText = shopData.shopAddress || "";
      document.getElementById("unlockShopContact").innerText = shopData.shopContact || shopData.contactNumber || "";
      listenForJobs();
    } catch (err) {
      alert("Error loading shop data");
      await signOut(auth);
      window.location.href = "login.html";
    }
  } else {
    window.location.href = "login.html";
  }
});

document.getElementById("logoutBtn").addEventListener("click", () =>
  signOut(auth).then(() => {
    window.location.href = "login.html";
  })
);

// === MAIN JOB FORM SUBMITS ===
document.getElementById("mobileJobForm").addEventListener("submit", e => {
  e.preventDefault();
  createJob("mobile");
});
document.getElementById("computerJobForm").addEventListener("submit", e => {
  e.preventDefault();
  createJob("computer");
});
document.getElementById("unlockingForm").addEventListener("submit", e => {
  e.preventDefault();
  createUnlocking();
});

// === CREATE JOB ===
async function createJob(type) {
  if (!currentUserId || !shopData) return;
  const isMobile = type === "mobile";
  const form = document.getElementById(isMobile ? "mobileJobForm" : "computerJobForm");
  let data = {
    customerName: form.querySelector("input[id$='CustomerName']").value.trim(),
    customerMobile: form.querySelector("input[id$='CustomerMobile']").value.trim(),
    deviceType: type,
    deviceName: isMobile ? form.querySelector("#mDeviceModel").value.trim() : form.querySelector("#cDeviceModel").value.trim(),
    imeiNumber: isMobile ? form.querySelector("#mImei").value.trim() : "",
    issueDescription: form.querySelector("textarea").value.trim(),
    estimatePrice: parseFloat(form.querySelector(isMobile ? "#mEstimatePrice" : "#cEstimatePrice").value) || 0,
    currentStatus: "Received",
    serviceCharge: 0,
    paidAmount: 0,
    receivedOn: serverTimestamp(),
    shopId: currentUserId,
    shopName: shopData.shopName || "",
    shopAddress: shopData.shopAddress || "",
    shopContact: shopData.shopContact || shopData.contactNumber || "",
    parts: []
  };
  try {
    const docRef = await addDoc(collection(db, "jobs"), data);
    alert("Job card created!");
    form.reset();
    // বিলের জন্য pdf জেনারেট
    getJobDataAndGenerateBill(docRef.id);
  } catch (err) {
    alert("Failed to add job: " + err.message);
  }
}

// === LISTEN/LOAD JOBS ===
function listenForJobs() {
  const q = query(collection(db, "jobs"), where("shopId", "==", currentUserId), orderBy("receivedOn", "desc"), limit(25));
  onSnapshot(q, snapshot => {
    const tbody = document.getElementById("jobs-table-body");
    tbody.innerHTML = "";
    activeJobs = {};
    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No jobs found.</td></tr>`;
      return;
    }
    snapshot.forEach(docSnap => {
      const j = docSnap.data();
      const id = docSnap.id;
      activeJobs[id] = { ...j, id };
      tbody.innerHTML += renderJobRow(j, id);
    });
  });
}

// === JOB TABLE RENDER ===
function renderJobRow(j, id) {
  const statusClass = {
    Received: "primary",
    InProgress: "warning text-dark",
    PartsWaiting: "danger",
    Ready: "success",
    Delivered: "secondary",
    NotRepaired: "dark"
  }[j.currentStatus] || "info";
  return `<tr>
    <td>${id.slice(0,5).toUpperCase()}</td>
    <td>${capitalize(j.deviceType)}</td>
    <td>${j.customerName}</td>
    <td>${j.customerMobile}</td>
    <td>${j.deviceName}</td>
    <td>₹${j.estimatePrice||0}</td>
    <td><span class="badge bg-${statusClass}">${j.currentStatus}</span></td>
    <td class="btn-actions">
      <button class="btn btn-sm btn-outline-primary" onclick="editJob('${id}')">Edit</button>
      <button class="btn btn-sm btn-outline-success" onclick="generateJobBill('${id}')">PDF</button>
    </td>
  </tr>`;
}
function capitalize(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

// === JOB MODAL/EDIT ===
window.editJob = async function(id) {
  const data = activeJobs[id];
  document.getElementById("editJobId").value = id;
  document.getElementById("editDeviceType").value = capitalize(data.deviceType || "");
  document.getElementById("editDeviceName").value = data.deviceName || "";
  document.getElementById("editIssueDescription").value = data.issueDescription || "";
  document.getElementById("editEstimatePrice").value = data.estimatePrice||0;
  document.getElementById("editServiceCharge").value = data.serviceCharge||0;
  document.getElementById("editPaidAmount").value = data.paidAmount||0;
  document.getElementById("editCurrentStatus").value = data.currentStatus||"Received";
  updatePartsContainer(data.parts||[]);
  new bootstrap.Modal(document.getElementById("editJobModal")).show();
};
document.getElementById("editJobForm").addEventListener("submit", async e => {
  e.preventDefault();
  const id = document.getElementById("editJobId").value;
  const parts = activeJobs[id].parts||[];
  const update = {
    deviceName: document.getElementById("editDeviceName").value.trim(),
    issueDescription: document.getElementById("editIssueDescription").value.trim(),
    serviceCharge: parseFloat(document.getElementById("editServiceCharge").value)||0,
    paidAmount: parseFloat(document.getElementById("editPaidAmount").value)||0,
    currentStatus: document.getElementById("editCurrentStatus").value,
    parts
  };
  try {
    await updateDoc(doc(db,"jobs",id),update);
    alert("Job updated!");
    bootstrap.Modal.getInstance(document.getElementById("editJobModal")).hide();
  } catch(err){ alert(err.message); }
});

// === PARTS MODAL ===
document.getElementById("addPartForm").addEventListener("submit", e=>{
  e.preventDefault();
  const name = document.getElementById("partName").value.trim();
  const cost = parseFloat(document.getElementById("partCost").value)||0;
  if(!name || cost<=0) return;
  const id = document.getElementById("editJobId").value;
  if(!activeJobs[id].parts) activeJobs[id].parts = [];
  activeJobs[id].parts.push({name, cost});
  updatePartsContainer(activeJobs[id].parts);
  updatePartsList(activeJobs[id].parts);
  document.getElementById("addPartForm").reset();
});
function updatePartsList(parts){
  const ul = document.getElementById("partsList");
  ul.innerHTML = "";
  if(!parts.length){ ul.innerHTML = `<li class="list-group-item text-muted">No parts added yet.</li>`; }
  parts.forEach((p,i)=>{
    ul.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">
      ${i+1}. ${p.name} <span>₹${p.cost}</span>
    </li>`;
  });
  document.getElementById("totalPartsCost").innerText = parts.reduce((t,p)=>t+(p.cost||0),0);
}
function updatePartsContainer(parts){
  const div = document.getElementById("partsContainer");
  div.innerHTML = "";
  if(!parts.length){ div.innerHTML = `<span class="text-muted">No parts used</span>`; return; }
  div.innerHTML = parts.map((p,i)=>`${i+1}. ${p.name} (₹${p.cost})`).join("<br>");
}
document.getElementById("managePartsBtn").addEventListener("click",()=>{
  const id = document.getElementById("editJobId").value;
  updatePartsList(activeJobs[id].parts||[]);
});

// === UNLOCKING DECLARATION FORM ===
async function createUnlocking(){
  if(!currentUserId||!shopData) return;
  let unlockTypes=[];
  if(document.getElementById("unlockPin").checked) unlockTypes.push("Pattern/PIN Unlock");
  if(document.getElementById("unlockFrp").checked) unlockTypes.push("FRP (Google Account) Unlock");
  if(document.getElementById("unlockNetwork").checked) unlockTypes.push("Network Unlock");
  if(document.getElementById("unlockOthers").checked) unlockTypes.push("Others");
  if(!unlockTypes.length){ alert("Select at least one unlock type."); return; }
  const data={
    shopName: shopData.shopName,
    shopAddress: shopData.shopAddress,
    shopContact: shopData.shopContact||shopData.contactNumber||"",
    deviceName:document.getElementById("uBrandModel").value.trim(),
    imeiNumber:document.getElementById("uImei").value.trim(),
    unlockTypes,
    customerName:document.getElementById("uFullName").value.trim(),
    customerAddress:document.getElementById("uAddress").value.trim(),
    customerPhone:document.getElementById("uPhoneNumber").value.trim(),
    customerId:document.getElementById("uIdTypeNumber").value.trim(),
    dateStr:document.getElementById("uDate").value,
    signature:document.getElementById("uCustomerSignature").value.trim(),
    createdOn: serverTimestamp(),
    shopId: currentUserId
  };
  try{
    const docRef=await addDoc(collection(db,"unlockDeclarations"),data);
    alert("Unlocking declaration saved!");
    generateUnlockPdf(data,docRef.id);
    document.getElementById("unlockingForm").reset();
  }catch(err){
    alert("Failed to save unlocking declaration: "+err.message);
  }
}

// === PDF GENERATE UNLOCKING DECLARATION ===
window.generateUnlockPdf = function(data, id) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();

    pdf.setFont('times', 'normal');
    pdf.setFontSize(15);
    pdf.text("Declaration for Mobile Unlocking Service", pageWidth/2, 22, {align:'center'});
    pdf.setFontSize(11);

    pdf.text(`Shop Name: ${data.shopName || ""}`, 15, 36);
    pdf.text(`Shop Address: ${data.shopAddress || ""}`, 15, 44);
    pdf.text(`Contact Number: ${data.shopContact || ""}`, 15, 52);

    pdf.line(15,54,pageWidth-15,54);
    pdf.setFontSize(12);

    pdf.text("I, the undersigned, hereby declare that I am the lawful owner/user of the mobile phone submitted for unlocking.", 15, 65, {maxWidth: pageWidth-30});

    pdf.setFontSize(11);
    pdf.text(`Brand & Model: ${data.deviceName}`, 15, 80);
    pdf.text(`IMEI Number: ${data.imeiNumber}`, 15, 88);

    let unlockTypes = (data.unlockTypes || []).map(u=>`[✓] ${u}`).join(" | ");
    pdf.text(`Type of Unlocking Required: ${unlockTypes}`, 15, 96);

    pdf.text("I understand and agree that:", 15, 108);
    pdf.text(`1. This unlocking is being done at my own request and risk.
2. The Mobile Solution and its technician(s) are not responsible for any data loss, damage, or legal issues.
3. I confirm that the device is not stolen or involved in any criminal or unlawful activity.
4. I am submitting a valid ID proof for verification purposes.`, 17, 114, {maxWidth: pageWidth-40});

    pdf.text("Customer Details:", 15, 138);
    pdf.text(`Full Name: ${data.customerName}`, 15, 146);
    pdf.text(`Address: ${data.customerAddress}`, 15, 154);
    pdf.text(`Phone: ${data.customerPhone}`, 15, 162);
    pdf.text(`ID Type & Number: ${data.customerId}`, 15, 170);

    pdf.text(`Date: ${data.dateStr}`, 15, 178);
    pdf.text("Customer Signature:", 15, 186);
    pdf.text(`${data.signature||"____________________"}`, 68, 186);

    pdf.setFontSize(10);
    pdf.setTextColor(130,130,130);
    pdf.text(`Powered by reparify.com`, pageWidth/2, 285, {align:'center'});

    pdf.save(`Unlocking_Declaration_${id}.pdf`);
};

// === PDF GENERATE JOB BILL ===
window.generateJobBill = async function(jobId) {
    await getJobDataAndGenerateBill(jobId);
}
async function getJobDataAndGenerateBill(jobId){
    const snap = await getDoc(doc(db,"jobs",jobId));
    if(!snap.exists()){ alert("Job not found."); return; }
    const data = snap.data();
    data.parts = data.parts||[];
    data.totalAmount = (data.serviceCharge||0) + (data.parts.reduce((t,p)=>t+(p.cost||0),0));
    data.dateStr = (new Date()).toLocaleDateString();
    data.shopName = shopData.shopName;
    data.shopAddress = shopData.shopAddress;
    data.shopContact = shopData.shopContact||shopData.contactNumber||"";
    generateJobPdf(data, jobId);
}

function generateJobPdf(data, id) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();

    pdf.setFont('times', 'normal');
    pdf.setFontSize(15);
    pdf.text("Repair Job Invoice", pageWidth/2, 22, {align:'center'});
    pdf.setFontSize(11);

    pdf.text(`Shop Name: ${data.shopName || ""}`, 15, 36);
    pdf.text(`Shop Address: ${data.shopAddress || ""}`, 15, 44);
    pdf.text(`Contact Number: ${data.shopContact || ""}`, 15, 52);
    pdf.line(15,54,pageWidth-15,54);

    pdf.setFontSize(12);
    pdf.text(`Customer Name: ${data.customerName}`, 15, 62);
    pdf.text(`Mobile: ${data.customerMobile}`, 15, 70);
    pdf.text(`Device Type: ${capitalize(data.deviceType)}`, 15, 78);
    pdf.text(`Device Model: ${data.deviceName}`, 15, 86);
    pdf.text(`IMEI: ${data.imeiNumber || "-"}`, 15, 94);

    pdf.text("Service Details:",15,104);
    pdf.text(`Issue: ${data.issueDescription}`,15,112);

    // Parts
    let y=120;
    pdf.text("Parts Used:", 15, y);
    y+=8;
    (data.parts||[]).forEach((p,idx)=>{
        pdf.text(`${idx+1}. ${p.name}  ₹${p.cost}`,20,y);
        y+=8;
    });

    y+=8;
    pdf.setFontSize(13);
    pdf.text(`Service Charge: ₹${data.serviceCharge||0}`, 15, y);
    y+=8;
    pdf.text(`Parts Cost: ₹${data.parts.reduce((t,p)=>t+(p.cost||0),0)}`, 15, y);
    y+=8;
    pdf.text(`Total Amount: ₹${data.totalAmount}`, 15, y);
    y+=8;
    pdf.setFontSize(10);
    pdf.text(`Paid: ₹${data.paidAmount||0}`, 15, y);

    pdf.text(`Date: ${data.dateStr}`,15,y+10);

    pdf.setFontSize(10);
    pdf.setTextColor(130,130,130);
    pdf.text(`Powered by reparify.com`, pageWidth/2, 285, {align:'center'});

    pdf.save(`Repair_Job_${id}.pdf`);
}
