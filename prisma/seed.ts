import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
 
(async () => {
  // Seed Admin
  await prisma.admin.create({
    data: {
      name: "System Admin",
      phoneno: "0942303571",
      passcode: "admin123",
      chat_id: "631321369",
    },
  });

  // Seed Students
  await prisma.wpos_wpdatatable_23.createMany({
    data: [
      {
        wdt_ID: 1001,
        name: "Mubarak Ahmed",
        passcode: "student1",
        phoneno: "0910203040",
        status: "Active",
        subject: "hifz",
        package: "kids",
        chat_id: "973677019",
        country: "Ethiopia", // added country
      },
      {
        wdt_ID: 1002,
        name: "Fuad Abdurahman",
        subject: "hifz",
        package: "kids",
        passcode: "student2",
        phoneno: "0910203041",
        status: "Active",
        chat_id: "611321369",
        country: "Saudi Arabia", // added country
      },
      {
        wdt_ID: 1003,
        subject: "hifz",
        package: "kids",
        name: "Abdulkarim ahmed",
        passcode: "student3",
        phoneno: "0910203042",
        status: "Active",
        chat_id: "973677021",
        country: "Dubai", // added country
      },
    ],
  });

  // Seed Packages
  await prisma.coursePackage.createMany({
    data: [
      {
        id: "pkg_001",
        name: "Qaida",
      },
      {
        id: "pkg_002",
        name: "Hifz",
      },
      {
        id: "pkg_003",
        name: "hadis",
      },
    ],
  });

  // Assign packages to students
  await prisma.wpos_wpdatatable_23.update({
    where: { wdt_ID: 1001 },
    data: {
      packages: {
        connect: [{ id: "pkg_001" }, { id: "pkg_002" }, { id: "pkg_003" }],
      },
      activePackage: {
        connect: { id: "pkg_001" },
      },
    },
  });

  await prisma.wpos_wpdatatable_23.update({
    where: { wdt_ID: 1002 },
    data: {
      packages: {
        connect: [{ id: "pkg_001" }],
      },
      activePackage: {
        connect: { id: "pkg_001" },
      },
    },
  });
  await prisma.subjectPackage.createMany({
    data: [
      {
        packageType: "kids",
        subject: "hifz",
        packageId: "pkg_001",
      },
      {
        packageType: "kids",
        subject: "hifz",
        packageId: "pkg_002",
      },
      {
        packageType: "kids",
        subject: "hifz",
        packageId: "pkg_003",
      },
    ],
  });

  await prisma.ustaz.createMany({
    data: [
      {
        picture: "https://example.com/images/ustaz1.jpg",
        control: "Admin",
        subject: "Fiqh",
        phone: "+251911234567",
        schedule: "Mon-Fri 8am-12pm",
        password: "hashed_password_1",
        telegramgroup: "https://t.me/fiqh_group",
        ustazname: "Ustaz Ahmed",
        gender: "Male",
        ustazid: "UST001",
        userid: 101,
        username: "ahmed_fiqh",
      },
      {
        picture: "https://example.com/images/ustaz2.jpg",
        control: "Moderator",
        subject: "Tafsir",
        phone: "+251922345678",
        schedule: "Sat-Sun 2pm-6pm",
        password: "hashed_password_2",
        telegramgroup: "https://t.me/tafsir_group",
        ustazname: "Ustaz Fatima",
        gender: "Female",
        ustazid: "UST002",
        userid: 102,
        username: "fatima_tafsir",
      },
      {
        picture: "https://example.com/images/ustaz3.jpg",
        control: "Teacher",
        subject: "Aqidah",
        phone: "+251933456789",
        schedule: "Wed-Fri 10am-1pm",
        password: "hashed_password_3",
        telegramgroup: "https://t.me/aqidah_group",
        ustazname: "Ustaz Musa",
        gender: "Male",
        ustazid: "UST003",
        userid: 103,
        username: "musa_aqidah",
      },
    ],
  });

  // Seed Courses for Programming Package
  await prisma.course.createMany({
    data: [
      {
        id: "course_001",
        title: "HAREKA",
        description: "Introduction to programming concepts",
        isPublished: true,
        order: 1,
        packageId: "pkg_001",
        imageUrl: "",
      },
      {
        id: "course_002",
        title: "TENWIN",
        description: "Learn OOP principles",
        isPublished: true,
        order: 2,
        packageId: "pkg_001",
        imageUrl: "",
      },
      {
        id: "course_003",
        title: "HAREKA",
        description: "Introduction to programming concepts",
        isPublished: true,
        order: 1,
        packageId: "pkg_002",
        imageUrl: "",
      },
      {
        id: "course_004",
        title: "TENWIN",
        description: "Learn OOP principles",
        isPublished: true,
        order: 2,
        packageId: "pkg_002",
        imageUrl: "",
      },
      {
        id: "course_005",
        title: "HAREKA",
        description: "Introduction to programming concepts",
        isPublished: true,
        order: 1,
        packageId: "pkg_003",
        imageUrl: "",
      },
      {
        id: "course_006",
        title: "TENWIN",
        description: "Learn OOP principles",
        isPublished: true,
        order: 2,
        packageId: "pkg_003",
        imageUrl: "",
      },
    ],
  });

  // Seed Chapters for Programming Basics Course
  await prisma.chapter.createMany({
    data: [
      {
        id: "chapter_001",
        title: "FETHA",
        description: "Learn about variables and basic data types",
        position: 1,
        isPublished: true,
        courseId: "course_001",
        videoUrl: "n7WNUaxPo8A",
      },
      {
        id: "chapter_002",
        title: "KESRA",
        description: "If statements and loops",
        position: 2,
        isPublished: true,
        courseId: "course_001",
        videoUrl: "Cv0I54sHMB8",
      },
      {
        id: "chapter_003",
        title: "DOMA",
        description: "Creating and using functions",
        position: 3,
        isPublished: true,
        courseId: "course_001",
        videoUrl: "oR5aGowK5V4",
      },
    ],
  });

  await prisma.chapter.createMany({
    data: [
      {
        id: "chapter_004",
        title: "SUKUN",
        description: "Introduction to OOP concepts",
        position: 1,
        isPublished: true,
        courseId: "course_002",
        videoUrl: "YbJAnbfN33o",
      },
      {
        id: "chapter_005",
        title: "FETHATAIB",
        description: "Understanding class inheritance",
        position: 2,
        isPublished: true,
        courseId: "course_002",
        videoUrl: "JnvWYDDxFuA",
      },
    ],
  });

  await prisma.chapter.createMany({
    data: [
      {
        id: "chapter_006",
        title: "FETHA",
        description: "Learn about variables and basic data types",
        position: 1,
        isPublished: true,
        courseId: "course_003",
        videoUrl: "n7WNUaxPo8A",
      },
      {
        id: "chapter_007",
        title: "KESRA",
        description: "If statements and loops",
        position: 2,
        isPublished: true,
        courseId: "course_003",
        videoUrl: "Cv0I54sHMB8",
      },
      {
        id: "chapter_008",
        title: "DOMA",
        description: "Creating and using functions",
        position: 3,
        isPublished: true,
        courseId: "course_003",
        videoUrl: "oR5aGowK5V4",
      },
    ],
  });

  // Seed Chapters for OOP Course
  await prisma.chapter.createMany({
    data: [
      {
        id: "chapter_009",
        title: "SUKUN",
        description: "Introduction to OOP concepts",
        position: 1,
        isPublished: true,
        courseId: "course_004",
        videoUrl: "YbJAnbfN33o",
      },
      {
        id: "chapter_010",
        title: "FETHATAIB",
        description: "Understanding class inheritance",
        position: 2,
        isPublished: true,
        courseId: "course_004",
        videoUrl: "JnvWYDDxFuA",
      },
    ],
  });
  await prisma.chapter.createMany({
    data: [
      {
        id: "chapter_011",
        title: "FETHA",
        description: "Learn about variables and basic data types",
        position: 1,
        isPublished: true,
        courseId: "course_005",
        videoUrl: "n7WNUaxPo8A",
      },
      {
        id: "chapter_012",
        title: "KESRA",
        description: "If statements and loops",
        position: 2,
        isPublished: true,
        courseId: "course_005",
        videoUrl: "Cv0I54sHMB8",
      },
      {
        id: "chapter_013",
        title: "DOMA",
        description: "Creating and using functions",
        position: 3,
        isPublished: true,
        courseId: "course_005",
        videoUrl: "oR5aGowK5V4",
      },
    ],
  });
  await prisma.chapter.createMany({
    data: [
      {
        id: "chapter_014",
        title: "SUKUN",
        description: "Introduction to OOP concepts",
        position: 1,
        isPublished: true,
        courseId: "course_006",
        videoUrl: "YbJAnbfN33o",
      },
      {
        id: "chapter_015",
        title: "FETHATAIB",
        description: "Understanding class inheritance",
        position: 2,
        isPublished: true,
        courseId: "course_006",
        videoUrl: "JnvWYDDxFuA",
      },
    ],
  });

  // --- SEED 5 QUESTIONS WITH OPTIONS FOR EACH CHAPTER ---

  const chapters = [
    "chapter_001",
    "chapter_002",
    "chapter_003",
    "chapter_011",
    "chapter_012",
  ];

  for (const chapterId of chapters) {
    for (let i = 1; i <= 5; i++) {
      const question = await prisma.question.create({
        data: {
          chapterId,
          question: `Sample Question ${i} for ${chapterId}`,
          questionOptions: {
            create: [
              { option: `Option 1 for Q${i}` },
              { option: `Option 2 for Q${i}` },
              { option: `Option 3 for Q${i}` },
              { option: `Option 4 for Q${i}` },
            ],
          },
        },
        include: { questionOptions: true },
      });

      // Optionally, set the first option as the correct answer
      await prisma.questionAnswer.create({
        data: {
          questionId: question.id,
          answerId: question.questionOptions[0].id,
        },
      });
    }
  }

  // Seed Student Progress for Completed Student
  await prisma.studentProgress.createMany({
    data: [
      // Student 1 completed all chapters in Course 1
      {
        studentId: 1001,
        chapterId: "chapter_001",
        isCompleted: true,
        completedAt: new Date("2023-02-01"),
      },
      {
        studentId: 1001,
        chapterId: "chapter_002",
        isCompleted: true,
        completedAt: new Date("2023-02-15"),
      },
      {
        studentId: 1001,
        chapterId: "chapter_003",
        isCompleted: true,
        completedAt: new Date("2023-02-28"),
      },
      // Student 1 completed all chapters in Course 2
      {
        studentId: 1001,
        chapterId: "chapter_004",
        isCompleted: true,
        completedAt: new Date("2023-03-10"),
      },
      {
        studentId: 1001,
        chapterId: "chapter_005",
        isCompleted: true,
        completedAt: new Date("2023-03-15"),
      },
    ],
  });

  // Seed Student Progress for Completed Student
  await prisma.studentProgress.createMany({
    data: [
      // Student 1 completed all chapters in Course 1
      {
        studentId: 1001,
        chapterId: "chapter_006",
        isCompleted: true,
        completedAt: new Date("2023-02-01"),
      },
      {
        studentId: 1001,
        chapterId: "chapter_007",
        isCompleted: true,
        completedAt: new Date("2023-02-15"),
      },
      {
        studentId: 1001,
        chapterId: "chapter_008",
        isCompleted: true,
        completedAt: new Date("2023-02-28"),
      },
      // Student 1 completed all chapters in Course 2
      {
        studentId: 1001,
        chapterId: "chapter_009",
        isCompleted: true,
        completedAt: new Date("2023-03-10"),
      },
      {
        studentId: 1001,
        chapterId: "chapter_010",
        isCompleted: false,
        completedAt: new Date("2023-03-15"),
      },
    ],
  });

  // Seed Student Progress for Completed Student
  await prisma.studentProgress.createMany({
    data: [
      // Student 1 completed all chapters in Course 1
      {
        studentId: 1001,
        chapterId: "chapter_011",
        isCompleted: true,
        completedAt: new Date("2023-02-01"),
      },
      {
        studentId: 1001,
        chapterId: "chapter_012",
        isCompleted: true,
        completedAt: new Date("2023-02-15"),
      },
      {
        studentId: 1001,
        chapterId: "chapter_013",
        isCompleted: true,
        completedAt: new Date("2023-02-28"),
      },
      // Student 1 completed all chapters in Course 2
      {
        studentId: 1001,
        chapterId: "chapter_014",
        isCompleted: true,
        completedAt: new Date("2023-03-10"),
      },
      {
        studentId: 1001,
        chapterId: "chapter_015",
        isCompleted: false,
        completedAt: new Date("2023-03-15"),
      },
    ],
  });
  // Seed Student Progress for In-Progress Student

  const packages = ["pkg_001", "pkg_002", "pkg_003"];

  for (const packageId of packages) {
    for (let i = 1; i <= 5; i++) {
      const question = await prisma.question.create({
        data: {
          packageId,
          question: `Sample Question ${i} for ${packageId}`,
          questionOptions: {
            create: [
              { option: `Option 1 for Q${i}` },
              { option: `Option 2 for Q${i}` },
              { option: `Option 3 for Q${i}` },
              { option: `Option 4 for Q${i}` },
            ],
          },
        },
        include: { questionOptions: true },
      });

      // Optionally, set the first option as the correct answer
      await prisma.questionAnswer.create({
        data: {
          questionId: question.id,
          answerId: question.questionOptions[0].id,
        },
      });
    }
  }

  console.log("🌱 Database seeded successfully with:");
  console.log("- 1 Admin user");
  console.log("- 3 Students with different progress levels");
  console.log("- 3 Packages (2 published, 1 unpublished)");
  console.log("- 4 Courses (2 in each published package)");
  console.log("- 5 Chapters with video content");
  console.log("- 5 Questions (with 4 options each) for every chapter");
  console.log("- Complete package history for testing");
  console.log("- Realistic student progress data");
  process.exit(0);
})().catch((e) => {
  console.error("❌ Seeding failed:", e);
  process.exit(1);
});
