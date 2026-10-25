require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const User = require('./models/User');
const Career = require('./models/Career');
const Skill = require('./models/Skill');
const Project = require('./models/Project');
const Assessment = require('./models/Assessment');

// ─── Seed Data ───────────────────────────────────────────────────────────────

const seedCareers = [
  {
    id: 'frontend-developer',
    title: 'Frontend Developer',
    category: 'Web Development',
    description: 'Build beautiful, interactive user interfaces for the web using modern frameworks and tools.',
    description_long: 'Frontend Developers create the visual and interactive elements of web applications that users see and interact with directly.',
    difficulty: 'Intermediate',
    matchPercentage: 87,
    avgSalary: '$85,000 - $130,000',
    jobGrowth: '15%',
    requiredSkills: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript', 'Git', 'Responsive Design'],
    color: '#6366f1',
    icon: '🖥️',
    roadmap: ['HTML & CSS Basics', 'JavaScript Fundamentals', 'React Framework', 'TypeScript', 'Testing', 'Build Tools'],
    projects: ['Personal Portfolio', 'Todo App with React', 'E-commerce Frontend', 'Weather Dashboard'],
  },
  {
    id: 'backend-developer',
    title: 'Backend Developer',
    category: 'Web Development',
    description: 'Design and build server-side logic, databases, and APIs that power web applications.',
    description_long: 'Backend Developers build and maintain the server-side of web applications, handling data storage, business logic, and API development.',
    difficulty: 'Intermediate',
    matchPercentage: 72,
    avgSalary: '$90,000 - $140,000',
    jobGrowth: '12%',
    requiredSkills: ['Node.js', 'Python', 'SQL', 'REST APIs', 'Authentication', 'Git', 'Cloud'],
    color: '#10b981',
    icon: '⚙️',
    roadmap: ['Programming Fundamentals', 'Node.js or Python', 'Databases', 'REST API Design', 'Authentication', 'Cloud Deployment'],
    projects: ['REST API Server', 'Authentication System', 'Blog Backend', 'E-commerce API'],
  },
  {
    id: 'fullstack-developer',
    title: 'Full Stack Developer',
    category: 'Web Development',
    description: 'Master both frontend and backend development to build complete web applications end-to-end.',
    description_long: 'Full Stack Developers have expertise in both frontend and backend development, allowing them to build complete web applications from scratch.',
    difficulty: 'Advanced',
    matchPercentage: 82,
    avgSalary: '$95,000 - $150,000',
    jobGrowth: '18%',
    requiredSkills: ['React', 'Node.js', 'SQL', 'REST APIs', 'TypeScript', 'Git', 'Cloud', 'Docker'],
    color: '#3b82f6',
    icon: '🔮',
    roadmap: ['HTML/CSS/JS', 'React', 'Node.js', 'Databases', 'APIs', 'DevOps Basics', 'Full Stack Projects'],
    projects: ['Full Stack Blog', 'Task Management App', 'Social Media Clone', 'E-commerce Platform'],
  },
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    category: 'Data & Analytics',
    description: 'Analyze complex datasets to extract insights and help organizations make data-driven decisions.',
    description_long: 'Data Analysts collect, process, and analyze large datasets to identify patterns, trends, and insights.',
    difficulty: 'Intermediate',
    matchPercentage: 67,
    avgSalary: '$70,000 - $110,000',
    jobGrowth: '25%',
    requiredSkills: ['SQL', 'Python', 'Excel', 'Tableau', 'Statistics', 'Data Visualization'],
    color: '#f59e0b',
    icon: '📊',
    roadmap: ['Statistics Basics', 'SQL', 'Python for Data', 'Data Visualization', 'Business Intelligence Tools'],
    projects: ['Sales Data Dashboard', 'Customer Segmentation', 'A/B Test Analysis', 'KPI Reporting Tool'],
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    category: 'Data & Analytics',
    description: 'Apply statistical analysis and machine learning to build predictive models from complex data.',
    description_long: 'Data Scientists use advanced statistical and machine learning techniques to analyze complex data and build predictive models.',
    difficulty: 'Advanced',
    matchPercentage: 58,
    avgSalary: '$100,000 - $160,000',
    jobGrowth: '36%',
    requiredSkills: ['Python', 'Machine Learning', 'Statistics', 'SQL', 'TensorFlow', 'Data Visualization'],
    color: '#ec4899',
    icon: '🔬',
    roadmap: ['Statistics & Math', 'Python', 'Machine Learning', 'Deep Learning', 'Data Engineering', 'Deployment'],
    projects: ['Predictive Model', 'NLP Classifier', 'Recommendation System', 'Image Recognition'],
  },
  {
    id: 'ai-ml-engineer',
    title: 'AI/ML Engineer',
    category: 'Artificial Intelligence',
    description: 'Build and deploy machine learning models and AI systems for production environments.',
    description_long: 'AI/ML Engineers design, build, and deploy machine learning systems at scale.',
    difficulty: 'Advanced',
    matchPercentage: 54,
    avgSalary: '$110,000 - $180,000',
    jobGrowth: '40%',
    requiredSkills: ['Python', 'TensorFlow', 'PyTorch', 'MLOps', 'Cloud', 'Docker', 'Statistics'],
    color: '#8b5cf6',
    icon: '🤖',
    roadmap: ['Python & Math', 'ML Fundamentals', 'Deep Learning', 'MLOps', 'Cloud Platforms', 'Production Systems'],
    projects: ['ML Pipeline', 'Model Deployment API', 'Automated Training System', 'AI Feature Store'],
  },
  {
    id: 'cloud-engineer',
    title: 'Cloud Engineer',
    category: 'Infrastructure',
    description: 'Design, build, and manage cloud infrastructure and services on platforms like AWS, GCP, or Azure.',
    description_long: 'Cloud Engineers build and manage cloud infrastructure to support modern applications.',
    difficulty: 'Intermediate',
    matchPercentage: 61,
    avgSalary: '$95,000 - $145,000',
    jobGrowth: '28%',
    requiredSkills: ['AWS/GCP/Azure', 'Terraform', 'Docker', 'Kubernetes', 'Linux', 'Networking'],
    color: '#06b6d4',
    icon: '☁️',
    roadmap: ['Linux Fundamentals', 'Networking', 'Cloud Platform Basics', 'IaC with Terraform', 'Kubernetes', 'Security'],
    projects: ['Auto-scaling Setup', 'CI/CD Pipeline', 'Multi-region Deployment', 'Cost Optimization Dashboard'],
  },
  {
    id: 'cybersecurity-analyst',
    title: 'Cybersecurity Analyst',
    category: 'Security',
    description: 'Protect organizations from cyber threats by monitoring, analyzing, and responding to security incidents.',
    description_long: 'Cybersecurity Analysts protect computer systems and networks from digital attacks.',
    difficulty: 'Intermediate',
    matchPercentage: 48,
    avgSalary: '$85,000 - $130,000',
    jobGrowth: '35%',
    requiredSkills: ['Network Security', 'Linux', 'SIEM', 'Penetration Testing', 'Python', 'Risk Analysis'],
    color: '#ef4444',
    icon: '🔒',
    roadmap: ['Networking Fundamentals', 'Linux', 'Security Concepts', 'Ethical Hacking', 'SIEM Tools', 'Certifications'],
    projects: ['Vulnerability Scanner', 'Security Dashboard', 'Log Analysis Tool', 'Threat Detection System'],
  },
  {
    id: 'ui-ux-designer',
    title: 'UI/UX Designer',
    category: 'Design',
    description: 'Design intuitive, beautiful user experiences and interfaces for digital products.',
    description_long: 'UI/UX Designers create user-centered digital experiences by combining visual design with usability principles.',
    difficulty: 'Intermediate',
    matchPercentage: 75,
    avgSalary: '$75,000 - $120,000',
    jobGrowth: '20%',
    requiredSkills: ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'HTML/CSS', 'Accessibility'],
    color: '#f97316',
    icon: '🎨',
    roadmap: ['Design Principles', 'Figma', 'User Research', 'Wireframing', 'Prototyping', 'Design Systems'],
    projects: ['Mobile App Design', 'Design System', 'Usability Study', 'Redesign Case Study'],
  },
  {
    id: 'devops-engineer',
    title: 'DevOps Engineer',
    category: 'Infrastructure',
    description: 'Bridge development and operations to automate deployments and build reliable software delivery pipelines.',
    description_long: 'DevOps Engineers automate and streamline the software development and deployment process.',
    difficulty: 'Advanced',
    matchPercentage: 65,
    avgSalary: '$100,000 - $155,000',
    jobGrowth: '22%',
    requiredSkills: ['CI/CD', 'Docker', 'Kubernetes', 'Linux', 'Python/Bash', 'Cloud', 'Monitoring'],
    color: '#84cc16',
    icon: '🚀',
    roadmap: ['Linux & Scripting', 'Git & CI/CD', 'Docker', 'Kubernetes', 'Cloud Platforms', 'Monitoring & Logging'],
    projects: ['CI/CD Pipeline', 'Container Orchestration', 'Infrastructure as Code', 'Monitoring Stack'],
  },
];

const seedSkills = [
  { name: 'HTML', category: 'Frontend', difficulty: 'Beginner', studentsLearning: 892, color: '#f97316', icon: '🌐', status: 'strong' },
  { name: 'CSS', category: 'Frontend', difficulty: 'Beginner', studentsLearning: 845, color: '#3b82f6', icon: '🎨', status: 'strong' },
  { name: 'JavaScript', category: 'Frontend', difficulty: 'Intermediate', studentsLearning: 967, color: '#f59e0b', icon: '⚡', status: 'medium' },
  { name: 'React', category: 'Frontend', difficulty: 'Intermediate', studentsLearning: 743, color: '#06b6d4', icon: '⚛️', status: 'high-priority' },
  { name: 'TypeScript', category: 'Frontend', difficulty: 'Intermediate', studentsLearning: 521, color: '#3b82f6', icon: '📘', status: 'medium' },
  { name: 'Node.js', category: 'Backend', difficulty: 'Intermediate', studentsLearning: 634, color: '#10b981', icon: '🟢', status: 'high-priority' },
  { name: 'Python', category: 'Backend', difficulty: 'Intermediate', studentsLearning: 812, color: '#8b5cf6', icon: '🐍', status: 'medium' },
  { name: 'SQL', category: 'Database', difficulty: 'Intermediate', studentsLearning: 678, color: '#ec4899', icon: '🗄️', status: 'medium' },
  { name: 'Git', category: 'Tools', difficulty: 'Beginner', studentsLearning: 891, color: '#ef4444', icon: '🔀', status: 'strong' },
  { name: 'REST APIs', category: 'Backend', difficulty: 'Intermediate', studentsLearning: 598, color: '#84cc16', icon: '🔌', status: 'high-priority' },
  { name: 'PostgreSQL', category: 'Database', difficulty: 'Intermediate', studentsLearning: 412, color: '#6366f1', icon: '🐘', status: 'medium' },
  { name: 'Docker', category: 'DevOps', difficulty: 'Advanced', studentsLearning: 356, color: '#06b6d4', icon: '🐳', status: 'not-started' },
  { name: 'AWS', category: 'Cloud', difficulty: 'Advanced', studentsLearning: 287, color: '#f59e0b', icon: '☁️', status: 'not-started' },
  { name: 'Tailwind CSS', category: 'Frontend', difficulty: 'Beginner', studentsLearning: 567, color: '#06b6d4', icon: '💨', status: 'medium' },
  { name: 'Next.js', category: 'Frontend', difficulty: 'Intermediate', studentsLearning: 432, color: '#0f172a', icon: '▲', status: 'not-started' },
];

const seedProjects = [
  {
    title: 'Student Management Dashboard',
    description: 'Build a full-featured student management system with CRUD operations, search, and filtering.',
    skills: ['React', 'State Management', 'REST API', 'CSS'],
    difficulty: 'Intermediate',
    estimatedTime: '15-20 hours',
    category: 'Web Development',
    status: 'recommended',
    popularity: 234,
    icon: '📊',
  },
  {
    title: 'Personal Portfolio Website',
    description: 'Create a professional portfolio website to showcase your projects, skills, and experience.',
    skills: ['HTML', 'CSS', 'JavaScript', 'React'],
    difficulty: 'Beginner',
    estimatedTime: '8-12 hours',
    category: 'Web Development',
    status: 'in-progress',
    popularity: 567,
    icon: '💼',
  },
  {
    title: 'Weather App with API',
    description: 'Build a weather application that fetches real-time weather data and displays it with visualizations.',
    skills: ['JavaScript', 'REST API', 'CSS', 'HTML'],
    difficulty: 'Beginner',
    estimatedTime: '6-10 hours',
    category: 'Web Development',
    status: 'not-started',
    popularity: 389,
    icon: '🌤️',
  },
  {
    title: 'E-commerce Product Page',
    description: 'Design and build a responsive product page with cart functionality using React state management.',
    skills: ['React', 'JavaScript', 'CSS', 'State Management'],
    difficulty: 'Intermediate',
    estimatedTime: '12-18 hours',
    category: 'Web Development',
    status: 'not-started',
    popularity: 298,
    icon: '🛒',
  },
  {
    title: 'Task Management App',
    description: 'Create a Kanban-style task management app with drag-and-drop and local storage.',
    skills: ['React', 'JavaScript', 'CSS', 'LocalStorage'],
    difficulty: 'Intermediate',
    estimatedTime: '20-25 hours',
    category: 'Web Development',
    status: 'not-started',
    popularity: 421,
    icon: '✅',
  },
  {
    title: 'Blog Platform Frontend',
    description: 'Build a full blog platform frontend with post listing, article views, categories, and search.',
    skills: ['React', 'React Router', 'CSS', 'State Management'],
    difficulty: 'Intermediate',
    estimatedTime: '18-25 hours',
    category: 'Web Development',
    status: 'not-started',
    popularity: 312,
    icon: '📝',
  },
  {
    title: 'Data Visualization Dashboard',
    description: 'Create an interactive dashboard with charts and graphs to visualize sample datasets.',
    skills: ['React', 'Recharts', 'JavaScript', 'CSS'],
    difficulty: 'Intermediate',
    estimatedTime: '15-20 hours',
    category: 'Data & Analytics',
    status: 'not-started',
    popularity: 187,
    icon: '📈',
  },
  {
    title: 'Chat Application UI',
    description: 'Build a real-time chat application UI with message threads, user avatars, and online status.',
    skills: ['React', 'JavaScript', 'CSS', 'State Management'],
    difficulty: 'Advanced',
    estimatedTime: '25-35 hours',
    category: 'Web Development',
    status: 'not-started',
    popularity: 256,
    icon: '💬',
  },
];

const seedUsers = [
  {
    firstName: 'Aarav',
    lastName: 'Patel',
    username: 'aarav',
    email: 'aarav@example.com',
    password: 'student123',
    role: 'student',
    location: 'Mumbai, India',
    bio: 'Passionate CS student with interest in web development.',
    education: {
      university: 'Mumbai Institute of Technology',
      degree: 'B.Tech Computer Science',
      graduationYear: 2025,
      gpa: '8.4 / 10',
    },
    careerGoal: 'Frontend Developer',
    interests: ['Web Development', 'UI/UX Design', 'Open Source'],
    skills: [
      { name: 'JavaScript', proficiency: 70 },
      { name: 'React', proficiency: 45 },
      { name: 'HTML', proficiency: 90 },
      { name: 'CSS', proficiency: 80 },
      { name: 'Git', proficiency: 75 },
    ],
    careerReadiness: 78,
    recommendedCareer: { title: 'Frontend Developer', match: 87, id: 'frontend-developer' },
    currentRoadmap: { title: 'React Fundamentals', progress: 42 },
    aiRecommendation: 'React is currently your biggest skill gap. Focus on components, props, state, and hooks next.',
    assessmentHistory: [
      { title: 'JavaScript Fundamentals', score: 78, date: new Date('2026-08-12'), status: 'completed' },
      { title: 'HTML & CSS Basics', score: 92, date: new Date('2026-07-28'), status: 'completed' },
    ],
    progressHistory: [
      { month: 'Mar', score: 52 },
      { month: 'Apr', score: 58 },
      { month: 'May', score: 63 },
      { month: 'Jun', score: 70 },
      { month: 'Jul', score: 74 },
      { month: 'Aug', score: 78 },
    ],
  },
  {
    firstName: 'Admin',
    lastName: 'User',
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
  },
];

const seedAssessment = {
  title: 'Career Assessment',
  questions: [
    {
      question: 'What type of work do you enjoy most?',
      options: [
        { id: 'a', label: 'Solving logical problems', value: 'logic', careers: ['backend-developer', 'data-analyst'] },
        { id: 'b', label: 'Creating visual experiences', value: 'visual', careers: ['frontend-developer', 'ui-ux-designer'] },
        { id: 'c', label: 'Working with data & numbers', value: 'data', careers: ['data-analyst', 'data-scientist'] },
        { id: 'd', label: 'Building software systems', value: 'systems', careers: ['fullstack-developer', 'backend-developer'] },
        { id: 'e', label: 'Working with people & design', value: 'people', careers: ['ui-ux-designer', 'frontend-developer'] },
      ],
    },
    {
      question: 'What is your current programming experience?',
      options: [
        { id: 'a', label: 'No experience yet', value: 'none', careers: ['frontend-developer', 'ui-ux-designer'] },
        { id: 'b', label: 'Basic HTML/CSS', value: 'basic', careers: ['frontend-developer', 'fullstack-developer'] },
        { id: 'c', label: 'JavaScript or Python', value: 'intermediate', careers: ['frontend-developer', 'data-analyst'] },
        { id: 'd', label: 'Multiple languages', value: 'advanced', careers: ['backend-developer', 'fullstack-developer'] },
        { id: 'e', label: 'Professional experience', value: 'professional', careers: ['data-scientist', 'devops-engineer'] },
      ],
    },
  ],
  attempts: 0,
  completionRate: 0,
  status: 'active',
};

// ─── Run Seed ─────────────────────────────────────────────────────────────────
const runSeed = async () => {
  try {
    await connectDB();
    console.log('\n🌱 Starting database seed...\n');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Career.deleteMany({}),
      Skill.deleteMany({}),
      Project.deleteMany({}),
      Assessment.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Insert seed data
    await Career.insertMany(seedCareers);
    console.log(`✅ Seeded ${seedCareers.length} careers`);

    await Skill.insertMany(seedSkills);
    console.log(`✅ Seeded ${seedSkills.length} skills`);

    await Project.insertMany(seedProjects);
    console.log(`✅ Seeded ${seedProjects.length} projects`);

    await Assessment.create(seedAssessment);
    console.log('✅ Seeded 1 assessment');

    // Create users (password will be hashed via pre-save hook)
    for (const userData of seedUsers) {
      await User.create(userData);
    }
    console.log(`✅ Seeded ${seedUsers.length} users`);

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('👤 Student login: aarav@example.com / student123');
    console.log('🛡️  Admin login:   admin@example.com / admin123\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
};

runSeed();
