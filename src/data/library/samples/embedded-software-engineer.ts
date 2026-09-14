import type { LibrarySample } from '../types'
import { content } from '../types'

/**
 * Firmware is measured in units nobody else on a résumé uses — milliamps,
 * microseconds, boot time — so the bullets keep the unit and then say what it
 * bought: battery life in the field, vehicles taking an update without a visit.
 */
export const sample: LibrarySample = {
  slug: 'embedded-software-engineer',
  role: 'Embedded Software Engineer',
  category: 'software',
  seniority: 'senior',
  region: 'india',
  template: 'beacon',
  blurb:
    'Nine years of firmware for electric two-wheelers, measured in milliamps, milliseconds and vehicles on the road.',
  keywords: [
    'embedded software engineer',
    'firmware engineer',
    'C programming',
    'RTOS',
    'battery management system',
    'automotive embedded',
    'ISO 26262',
  ],
  content: content({
    basics: {
      name: 'Shalini Prabhakar',
      label: 'Embedded Software Engineer',
      image: '',
      email: 'shalini.prabhakar@example.com',
      phone: '+91 12345 84206',
      url: 'https://shaliniprabhakar.example.com',
      summary:
        'Embedded software engineer with nine years on motor control and battery management firmware for electric two-wheelers. Wrote the state-of-charge estimator now running on 180,000 vehicles, which has held under 2% error through its third Indian summer.',
      location: { city: 'Chennai', region: 'Tamil Nadu', countryCode: 'IN' },
      profiles: [
        { network: 'LinkedIn', username: 'shaliniprabhakar', url: 'https://linkedin.com/in/shaliniprabhakar' },
        { network: 'GitHub', username: 'sprabhakar-fw', url: 'https://github.com/sprabhakar-fw' },
      ],
    },
    work: [
      {
        id: 'w1',
        name: 'Vaanam Mobility Systems',
        position: 'Senior Embedded Software Engineer',
        location: 'Chennai, Tamil Nadu',
        url: '',
        startDate: '2021-06',
        endDate: '',
        summary: 'Battery management and motor controller firmware for two electric two-wheeler platforms.',
        highlights: [
          'Wrote the state-of-charge estimator shipping on 180,000 vehicles, holding error under 2% where the previous coulomb-counting model drifted to 11%.',
          'Cut controller boot time from 1.9s to 260ms by executing calibration tables in place and deferring diagnostics to the first idle window.',
          'Built the over-the-air update path with A/B partitions and rollback; 94% of the fleet now takes a release in ten days, against a dealer visit before.',
          'Closed an ISO 26262 ASIL-B gap analysis on the regenerative braking path, taking the audit from 23 findings to none over two cycles.',
        ],
      },
      {
        id: 'w2',
        name: 'Thendral Micro',
        position: 'Embedded Engineer',
        location: 'Bengaluru, Karnataka',
        url: '',
        startDate: '2018-03',
        endDate: '2021-05',
        summary: '',
        highlights: [
          'Ported a sensor stack from bare metal to FreeRTOS across four board revisions, cutting missed CAN frames from 400 a day to 3.',
          'Reduced standby draw from 18mA to 0.7mA on an industrial gateway, taking field battery life from five months to four years.',
          'Built the hardware-in-the-loop rig that replaced bench testing by hand, running 240 regression cases every night.',
        ],
      },
      {
        id: 'w3',
        name: 'Meghadoot Instruments',
        position: 'Firmware Engineer',
        location: 'Coimbatore, Tamil Nadu',
        url: '',
        startDate: '2015-07',
        endDate: '2018-02',
        summary: '',
        highlights: [
          'Delivered the Modbus interface for a water-pump controller installed at 2,600 sites, ending a recurring class of calibration site visits.',
          'Cut a motor-drive interrupt handler from 40 microseconds to 9, which let the control loop move from 4kHz to 16kHz.',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        institution: 'College of Engineering, Guindy, Anna University',
        area: 'Electronics and Communication Engineering',
        studyType: 'B.E.',
        location: 'Chennai, Tamil Nadu',
        startDate: '2011-07',
        endDate: '2015-05',
        score: '8.8 CGPA',
        url: '',
        summary: '',
        courses: [],
      },
    ],
    skills: [
      { id: 's1', name: 'Languages', level: '', keywords: ['C', 'C++', 'Python', 'Rust', 'ARM assembly'] },
      {
        id: 's2',
        name: 'Platforms',
        level: '',
        keywords: ['ARM Cortex-M', 'FreeRTOS', 'Zephyr', 'CAN and CAN FD', 'SPI, I2C, UART'],
      },
      {
        id: 's3',
        name: 'Practice',
        level: '',
        keywords: ['ISO 26262 (ASIL-B)', 'Hardware-in-the-loop testing', 'Low-power design', 'Bootloaders and OTA'],
      },
    ],
    custom: [
      {
        id: 'cs1',
        name: 'Patents',
        items: [
          {
            id: 'ci1',
            name: 'State-of-charge estimation for lithium-ion packs at high ambient temperature',
            subtitle: 'Indian Patent Office, application filed',
            date: '2024',
            location: '',
            url: '',
            summary: 'Co-inventor. Covers the thermal compensation model shipping on 180,000 vehicles.',
            highlights: [],
          },
          {
            id: 'ci2',
            name: 'Rollback-safe firmware update for motor controllers',
            subtitle: 'Indian Patent Office, application filed',
            date: '2022',
            location: '',
            url: '',
            summary: 'Co-inventor with two colleagues.',
            highlights: [],
          },
        ],
      },
    ],
    languages: [
      { id: 'l1', language: 'English', fluency: 'Professional', rating: 5 },
      { id: 'l2', language: 'Tamil', fluency: 'Native', rating: 5 },
      { id: 'l3', language: 'Hindi', fluency: 'Conversational', rating: 3 },
    ],
  }),
}

export default sample
