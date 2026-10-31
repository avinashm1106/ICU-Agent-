import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  console.log('Seeding ICU Command database...');

  // Clear existing records in safe dependency order
  await db.reminder.deleteMany();
  await db.taskResponse.deleteMany();
  await db.taskAssignment.deleteMany();
  await db.whatsAppMessage.deleteMany();
  await db.notification.deleteMany();
  await db.auditLog.deleteMany();
  await db.task.deleteMany();
  await db.voiceSession.deleteMany();
  await db.aIExtraction.deleteMany();
  await db.patient.deleteMany();
  await db.user.deleteMany();
  await db.escalationRule.deleteMany();
  await db.iCU.deleteMany();
  await db.hospital.deleteMany();

  // 1. Create Hospital & ICU
  const hospital = await db.hospital.create({
    data: { name: 'St. Raphael Medical Center' },
  });

  const icu = await db.iCU.create({
    data: {
      name: 'ICU-01',
      hospitalId: hospital.id,
      escalation: {
        create: {
          firstSeconds: 900,
          secondSeconds: 1800,
          escalateSeconds: 2700,
        },
      },
    },
  });

  // 2. Create Users
  const userDefinitions = [
    { name: 'Dr. Arjun Mehta', email: 'consultant@icu-demo.com', role: 'CONSULTANT', pass: 'Doctor@123' },
    { name: 'System Admin', email: 'admin@icu-demo.com', role: 'ADMIN', pass: 'Admin@123' },
    { name: 'Nurse Anitha', email: 'anitha@icu-demo.com', role: 'STAFF', pass: 'Staff@123' },
    { name: 'Ramesh (Ventilator Tech)', email: 'ramesh@icu-demo.com', role: 'STAFF', pass: 'Staff@123' },
    { name: 'Sister Priya', email: 'priya@icu-demo.com', role: 'STAFF', pass: 'Staff@123' },
    { name: 'Dr. Kumar (Resident)', email: 'kumar@icu-demo.com', role: 'STAFF', pass: 'Staff@123' },
    { name: 'Suresh (ICU Tech)', email: 'suresh@icu-demo.com', role: 'STAFF', pass: 'Staff@123' },
    { name: 'Meera (Staff Nurse)', email: 'meera@icu-demo.com', role: 'STAFF', pass: 'Staff@123' },
  ] as const;

  const users: Record<string, any> = {};
  for (const u of userDefinitions) {
    const passwordHash = await hash(u.pass, 10);
    const created = await db.user.create({
      data: {
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash,
        hospitalId: hospital.id,
        icuId: icu.id,
        active: true,
      },
    });
    users[u.email] = created;
  }

  // 3. Create 20 Monitored ICU Beds (Patients A through T)
  const patients: any[] = [];
  for (let bed = 1; bed <= 20; bed++) {
    const letter = String.fromCharCode(64 + bed);
    const p = await db.patient.create({
      data: {
        name: `Patient ${letter}`,
        bedNumber: bed,
        icuId: icu.id,
      },
    });
    patients.push(p);
  }

  // 4. Clinical Task Titles & Descriptions
  const staffUsers = [
    users['anitha@icu-demo.com'],
    users['ramesh@icu-demo.com'],
    users['priya@icu-demo.com'],
    users['kumar@icu-demo.com'],
    users['suresh@icu-demo.com'],
    users['meera@icu-demo.com'],
  ];

  const clinicalTemplates = [
    { title: 'Check medication chart & verify dosage', desc: 'Confirm IV infusion rates and cross-verify with MAR sheet', pri: 'HIGH' },
    { title: 'Check ventilator settings & PEEP levels', desc: 'Verify tidal volume 450ml, PEEP 8, FiO2 45%', pri: 'CRITICAL' },
    { title: 'Review arterial blood gas (ABG) report', desc: 'Inspect PaO2, PaCO2, and pH levels, report abnormal lactate', pri: 'HIGH' },
    { title: 'Check emergency crash trolley stock', desc: 'Ensure defibrillator pads, suction tubes, and adrenaline amps verified', pri: 'MEDIUM' },
    { title: 'Verify central venous line dressing', desc: 'Inspect for erythema, date of insertion, and line patency', pri: 'MEDIUM' },
    { title: 'Confirm blood cross-matching with blood bank', desc: '2 units packed red blood cells requested for Bed 12', pri: 'HIGH' },
    { title: 'Obtain 12-lead ECG for telemetry evaluation', desc: 'Check for ST elevation or new dysrhythmias', pri: 'CRITICAL' },
    { title: 'Monitor urinary output & fluid balance', desc: 'Ensure hourly output exceeds 30ml/hr', pri: 'LOW' },
    { title: 'Verify shift handover checklist', desc: 'Ensure pending lab results noted in bedside folder', pri: 'MEDIUM' },
    { title: 'Check endotracheal cuff pressure', desc: 'Maintain cuff pressure between 20-30 cmH2O', pri: 'HIGH' },
    { title: 'Draw serum potassium & electrolytes sample', desc: 'Stat blood draw for stat biochemistry profile', pri: 'HIGH' },
    { title: 'Calibrate pressure transducer for arterial line', desc: 'Zero transducer at mid-axillary line level', pri: 'MEDIUM' },
  ] as const;

  const consultant = users['consultant@icu-demo.com'];

  // Seed 44 realistic tasks across statuses
  const statuses = [
    'COMPLETED',
    'COMPLETED',
    'COMPLETED',
    'PENDING',
    'PENDING',
    'IN_PROGRESS',
    'BLOCKED',
    'OVERDUE',
  ] as const;

  for (let i = 0; i < 44; i++) {
    const tmpl = clinicalTemplates[i % clinicalTemplates.length];
    const staff = staffUsers[i % staffUsers.length];
    const status = statuses[i % statuses.length];
    const bed = (i % 20) + 1;
    const now = Date.now();
    const createdAt = new Date(now - (i * 12 + 10) * 60 * 1000); // spread across shift

    let completedAt: Date | null = null;
    let responseAt: Date | null = null;
    let deadline: Date | null = null;

    if (status === 'COMPLETED') {
      completedAt = new Date(createdAt.getTime() + 15 * 60 * 1000);
      responseAt = completedAt;
    } else if (status === 'OVERDUE') {
      deadline = new Date(now - 30 * 60 * 1000); // 30 min ago
    } else if (status === 'BLOCKED') {
      responseAt = new Date(createdAt.getTime() + 5 * 60 * 1000);
    }

    const task = await db.task.create({
      data: {
        title: `${tmpl.title} — Bed ${bed}`,
        description: tmpl.desc,
        priority: tmpl.pri as any,
        status: status as any,
        source: i % 3 === 0 ? 'VOICE' : 'MANUAL',
        bedNumber: bed,
        assignedToId: staff.id,
        createdById: consultant.id,
        icuId: icu.id,
        patientId: patients[bed - 1].id,
        deadline,
        completedAt,
        responseAt,
        createdAt,
      },
    });

    // Record assignment
    await db.taskAssignment.create({
      data: {
        taskId: task.id,
        userId: staff.id,
        assignedAt: createdAt,
      },
    });

    // Create Initial Outgoing WhatsApp message
    await db.whatsAppMessage.create({
      data: {
        taskId: task.id,
        userId: staff.id,
        direction: 'OUT',
        text: `🚨 *New ICU Task Dispatched*\n*Task:* ${task.title}\n*Priority:* ${task.priority}\n*Assigned By:* ${consultant.name}\n\nPlease review immediately.\n👉 Reply *YES* when completed or *NO* if unable.`,
        createdAt,
      },
    });

    // If completed or blocked, simulate staff WhatsApp response
    if (status === 'COMPLETED') {
      await db.taskResponse.create({
        data: {
          taskId: task.id,
          userId: staff.id,
          answer: 'YES',
          createdAt: completedAt!,
        },
      });

      await db.whatsAppMessage.create({
        data: {
          taskId: task.id,
          userId: staff.id,
          direction: 'IN',
          text: 'YES — Completed',
          createdAt: completedAt!,
        },
      });

      await db.whatsAppMessage.create({
        data: {
          taskId: task.id,
          userId: staff.id,
          direction: 'OUT',
          text: `✅ Task marked as *COMPLETED* at ${completedAt!.toLocaleTimeString()}.\nThank you for confirming.`,
          createdAt: new Date(completedAt!.getTime() + 1000),
        },
      });
    } else if (status === 'BLOCKED') {
      await db.taskResponse.create({
        data: {
          taskId: task.id,
          userId: staff.id,
          answer: 'NO: Occupied with crash cart in Bed 4',
          createdAt: responseAt!,
        },
      });

      await db.whatsAppMessage.create({
        data: {
          taskId: task.id,
          userId: staff.id,
          direction: 'IN',
          text: 'NO — Unable (Occupied with crash cart in Bed 4)',
          createdAt: responseAt!,
        },
      });

      await db.whatsAppMessage.create({
        data: {
          taskId: task.id,
          userId: staff.id,
          direction: 'OUT',
          text: `⚠️ Task marked as *BLOCKED*.\nConsultant ${consultant.name} has been alerted for reassignment.`,
          createdAt: new Date(responseAt!.getTime() + 1000),
        },
      });

      await db.notification.create({
        data: {
          userId: consultant.id,
          text: `⚠️ Staff unable to complete: ${task.title} (${staff.name})`,
          createdAt: responseAt!,
        },
      });
    }

    // Seed Audit Log
    await db.auditLog.create({
      data: {
        actorId: consultant.id,
        action: 'TASK_CREATED',
        entity: 'Task',
        entityId: task.id,
        metadata: JSON.stringify({ title: task.title, staff: staff.name, bed }),
        createdAt,
      },
    });
  }

  console.log('✅ Seed completed successfully:');
  console.log(`- Hospital: ${hospital.name}`);
  console.log(`- ICU: ${icu.name} with 20 monitored beds`);
  console.log(`- 8 Users seeded (1 Consultant, 1 Admin, 6 Staff members)`);
  console.log(`- 44 Tasks seeded across all statuses and priorities`);
  console.log(`- Mock WhatsApp message histories populated`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
