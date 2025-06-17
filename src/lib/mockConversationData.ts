// Mock data for the User Conversation Viewer feature
// This simulates data that would come from the Supabase database

// Types to match what we'll need from the database
export type Account = {
  id: string;
  email: string;
  is_test_account?: boolean;
  created_at: string;
};

export type Artist = {
  id: string;
  account_id: string;
  name: string;
  reference_id?: string;
};

export type Room = {
  id: string;
  account_id: string;
  created_at: string;
  last_message_date: string;
};

export type Message = {
  id: string;
  room_id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
};

// Generate mock accounts
export const mockAccounts: Account[] = [
  {
    id: '1',
    email: 'jackson@wearehume.com',
    is_test_account: false,
    created_at: '2023-02-25T08:15:22Z'
  },
  {
    id: '2',
    email: 'test@example.com',
    is_test_account: true,
    created_at: '2023-02-26T10:30:45Z'
  },
  {
    id: '3',
    email: 'user@gmail.com',
    is_test_account: false,
    created_at: '2023-03-01T14:22:10Z'
  },
  {
    id: '4',
    email: 'artist@musiclabel.com',
    is_test_account: false,
    created_at: '2023-03-02T09:45:33Z'
  },
  {
    id: '5',
    email: 'dev-test@internal.co',
    is_test_account: true,
    created_at: '2023-03-03T16:20:15Z'
  }
];

// Generate mock artists
export const mockArtists: Artist[] = [
  {
    id: '101',
    account_id: '1',
    name: 'DEATHPIXIE',
    reference_id: '6695665-6642-439164956689'
  },
  {
    id: '102',
    account_id: '2',
    name: 'Test Artist',
    reference_id: '1234567-8901-2345678901234'
  },
  {
    id: '103',
    account_id: '3',
    name: 'High Fidelity',
    reference_id: '1d 23 dm'
  },
  {
    id: '104',
    account_id: '4',
    name: 'High Faltery',
    reference_id: 'Coldplay123 -123dw'
  },
  {
    id: '105',
    account_id: '5',
    name: 'nana',
    reference_id: 'Bainyminne 8w'
  },
  {
    id: '106',
    account_id: '1',
    name: 'kid Indigo',
    reference_id: 'Kid Indigo 123w'
  },
  {
    id: '107',
    account_id: '2',
    name: '12.multi',
    reference_id: '12 muil'
  }
];

// Generate mock rooms (conversations)
export const mockRooms: Room[] = [
  {
    id: 'room-1',
    account_id: '1',
    created_at: '2024-03-02T09:27:15Z',
    last_message_date: '2024-03-05T08:27:45Z'
  },
  {
    id: 'room-2',
    account_id: '3',
    created_at: '2024-03-03T14:15:22Z',
    last_message_date: '2024-03-04T16:45:30Z'
  },
  {
    id: 'room-3',
    account_id: '4',
    created_at: '2024-02-31T11:10:05Z',
    last_message_date: '2024-03-03T10:30:12Z'
  },
  {
    id: 'room-4',
    account_id: '5',
    created_at: '2024-03-07T15:45:30Z',
    last_message_date: '2024-03-05T17:22:45Z'
  },
  {
    id: 'room-5',
    account_id: '1',
    created_at: '2024-03-08T12:10:05Z',
    last_message_date: '2024-03-05T13:15:22Z'
  },
  {
    id: 'room-6',
    account_id: '2',
    created_at: '2024-03-03T08:45:30Z',
    last_message_date: '2024-03-03T10:10:05Z'
  }
];

// Generate mock messages
export const mockMessages: Record<string, Message[]> = {
  'room-1': [
    {
      id: 'msg-1-1',
      room_id: 'room-1',
      content: 'What are DEATHPIXIEs vision and inspirations?',
      role: 'user',
      created_at: '2024-03-02T09:27:15Z'
    },
    {
      id: 'msg-1-2',
      room_id: 'room-1',
      content: "DEATHPIXIE's vision is \"to ignite rave culture into explosive flames through a punk twist with a shape-shifting approach to music\", inspired by iconic artists and was born from the underground, embodying the belief that raves are more than just parties",
      role: 'assistant',
      created_at: '2024-03-02T09:27:45Z'
    },
    {
      id: 'msg-1-3',
      room_id: 'room-1',
      content: 'What are Bo Ningen or Bo Lerisen artistic influences?',
      role: 'user',
      created_at: '2024-03-05T08:27:15Z'
    },
    {
      id: 'msg-1-4',
      room_id: 'room-1',
      content: "Bo Ningen's artistic influences include psychedelic rock, noise music, and Japanese avant-garde artists. They blend these influences with punk energy and experimental sound techniques to create their unique sonic palette.",
      role: 'assistant',
      created_at: '2024-03-05T08:27:45Z'
    }
  ],
  'room-2': [
    {
      id: 'msg-2-1',
      room_id: 'room-2',
      content: 'How do I promote my upcoming album release?',
      role: 'user',
      created_at: '2024-03-03T14:15:22Z'
    },
    {
      id: 'msg-2-2',
      room_id: 'room-2',
      content: 'To promote your album effectively, consider these strategies: 1) Create a release calendar with pre-save links, singles, and video drops, 2) Leverage social media with consistent content, 3) Reach out to playlist curators and music blogs, 4) Consider hiring a PR specialist if budget allows, 5) Plan a release show or virtual event, and 6) Collaborate with other artists for cross-promotion.',
      role: 'assistant',
      created_at: '2024-03-03T14:16:10Z'
    },
    {
      id: 'msg-2-3',
      room_id: 'room-2',
      content: 'Which streaming platforms should I focus on?',
      role: 'user',
      created_at: '2024-03-04T16:45:00Z'
    },
    {
      id: 'msg-2-4',
      room_id: 'room-2',
      content: 'You should focus on Spotify as your primary platform due to its large user base and playlist ecosystem, followed by Apple Music for its high-value subscribers. For genre-specific focus, consider Bandcamp for direct fan support, SoundCloud for electronic/hip-hop communities, and YouTube Music for visual content integration. Track performance across platforms using analytics to refine your strategy over time.',
      role: 'assistant',
      created_at: '2024-03-04T16:45:30Z'
    }
  ],
  'room-3': [
    {
      id: 'msg-3-1',
      room_id: 'room-3',
      content: 'Can you help me understand sync licensing for my music?',
      role: 'user',
      created_at: '2024-02-31T11:10:05Z'
    },
    {
      id: 'msg-3-2',
      room_id: 'room-3',
      content: 'Sync licensing allows your music to be used in visual media like films, TV shows, commercials, and games. It involves negotiating rights, fees, and usage terms. You can pursue sync opportunities through specialized sync agencies, music libraries, direct outreach to music supervisors, or by having your distributor or label represent your catalog. Make sure your tracks are professionally produced and cleared of any samples before pursuing sync opportunities.',
      role: 'assistant',
      created_at: '2024-02-31T11:11:30Z'
    },
    {
      id: 'msg-3-3',
      room_id: 'room-3',
      content: 'What percentage should I expect from a sync deal?',
      role: 'user',
      created_at: '2024-03-03T10:29:45Z'
    },
    {
      id: 'msg-3-4',
      room_id: 'room-3',
      content: 'For sync deals, independent artists typically receive 50-100% of the sync fee if self-represented, or 50-75% if working through a sync agency (they take 25-50%). When represented by a label or publisher, you might receive 25-50% of the sync fee based on your contract. Upfront fees range widely from $50-500 for small projects to thousands or tens of thousands for major placements. Ensure you understand both upfront fees and backend royalties when negotiating deals.',
      role: 'assistant',
      created_at: '2024-03-03T10:30:12Z'
    }
  ],
  'room-4': [
    {
      id: 'msg-4-1',
      room_id: 'room-4',
      content: 'How can I find the right manager for my career?',
      role: 'user',
      created_at: '2024-03-07T15:45:30Z'
    },
    {
      id: 'msg-4-2',
      room_id: 'room-4',
      content: "To find the right manager, first ensure you're ready by having momentum in your career (growing fanbase, streaming numbers, or live performance demand). Research potential managers who work with similar artists at your career stage. Network at industry events, ask for referrals from music professionals you know, and consider approaching junior agents at established management companies. Look for someone who is passionate about your music, has relevant industry connections, communicates well, and shares your vision. Standard management deals are 15-20% of income, so ensure the partnership feels valuable enough to justify this.",
      role: 'assistant',
      created_at: '2024-03-07T15:46:15Z'
    },
    {
      id: 'msg-4-3',
      room_id: 'room-4',
      content: 'What questions should I ask a potential manager?',
      role: 'user',
      created_at: '2024-03-05T17:22:15Z'
    },
    {
      id: 'msg-4-4',
      room_id: 'room-4',
      content: 'When interviewing a potential manager, ask these key questions: 1) What is their vision for your career over the next 1-2 years? 2) Which specific industry connections can they leverage for your benefit? 3) What other artists do they manage and how will they balance their time? 4) How do they typically communicate with clients and how often? 5) What do they see as your strengths and areas for development? 6) What percentage do they take and what services are included? 7) What would success look like after 6 months of working together? Their answers will reveal their management style, industry knowledge, and how well they understand your specific needs.',
      role: 'assistant',
      created_at: '2024-03-05T17:22:45Z'
    }
  ],
  'room-5': [
    {
      id: 'msg-5-1',
      room_id: 'room-5',
      content: 'Do you have any tips for navigating music distribution deals?',
      role: 'user',
      created_at: '2024-03-08T12:10:05Z'
    },
    {
      id: 'msg-5-2',
      room_id: 'room-5',
      content: 'When navigating music distribution deals, consider these key factors: 1) Royalty rates - independent distributors typically offer 80-100% of streaming revenue vs. label deals at 15-50%. 2) Term length - avoid lengthy exclusivity periods; prefer 1-3 years with options to renew. 3) Rights retention - maintain ownership of your master recordings when possible. 4) Service offerings - compare marketing support, playlist pitching, and analytics tools. 5) Distribution breadth - ensure all major platforms and international markets are covered. 6) Payment schedules - look for monthly or quarterly payments with transparent reporting. Read contracts carefully and consider having an entertainment attorney review before signing.',
      role: 'assistant',
      created_at: '2024-03-08T12:11:30Z'
    },
    {
      id: 'msg-5-3',
      room_id: 'room-5',
      content: 'What are the red flags I should watch out for?',
      role: 'user',
      created_at: '2024-03-05T13:14:45Z'
    },
    {
      id: 'msg-5-4',
      room_id: 'room-5',
      content: 'Watch for these red flags in music distribution deals: 1) Demanding copyright ownership of your masters, 2) Extremely long contract terms (5+ years) with no exit options, 3) Vague or missing payment schedules and reporting details, 4) Hidden fees for basic services like ISRC codes or metadata changes, 5) Unclear revenue splits or complicated royalty calculations, 6) Requiring rights to your publishing when only offering distribution, 7) Promises of playlist placement that seem too good to be true, 8) Poor communication during negotiation stages, and 9) Pressure tactics to sign quickly without proper review. Always get agreements reviewed by an entertainment attorney before signing.',
      role: 'assistant',
      created_at: '2024-03-05T13:15:22Z'
    }
  ],
  'room-6': [
    {
      id: 'msg-6-1',
      room_id: 'room-6',
      content: 'What strategies work best for growing a fanbase from scratch?',
      role: 'user',
      created_at: '2024-03-03T08:45:30Z'
    },
    {
      id: 'msg-6-2',
      room_id: 'room-6',
      content: "To grow a fanbase from scratch: 1) Define your unique artist identity and target audience, 2) Create consistent, high-quality content across platforms, focusing on 1-2 primary channels, 3) Build authentic relationships by responding to comments and engaging with similar artists' communities, 4) Collaborate with complementary artists to access their audiences, 5) Use data to refine your strategy by tracking which content performs best, 6) Develop an email list to directly communicate with fans, 7) Consider strategic advertising to boost visibility, 8) Create shareable content that encourages fan participation, and 9) Be patient and consistent—meaningful growth takes time and sustained effort.",
      role: 'assistant',
      created_at: '2024-03-03T08:46:45Z'
    },
    {
      id: 'msg-6-3',
      room_id: 'room-6',
      content: 'Should I focus more on social media or live performances?',
      role: 'user',
      created_at: '2024-03-03T10:09:30Z'
    },
    {
      id: 'msg-6-4',
      room_id: 'room-6',
      content: 'The optimal balance between social media and live performances depends on your genre, location, and career stage. Social media offers global reach, scalability, and measurable results with lower upfront costs, making it essential for initial audience building. Live performances create deeper fan connections, immediate revenue, and networking opportunities, but require more resources. Initially, focus more (70%) on establishing a strong social media presence to build awareness, then gradually shift to a more balanced approach (50/50) as you gain traction. The key is using each to enhance the other—promote shows online and capture live content for social media—creating a sustainable growth cycle.',
      role: 'assistant',
      created_at: '2024-03-03T10:10:05Z'
    }
  ]
};

// Helper function to join the data together (simulating database joins)
export type ConversationListItem = {
  room_id: string;
  account_id: string;
  created_at: string;
  last_message_date: string;
  account_email: string;
  artist_id: string;
  artist_name: string;
  artist_reference: string;
  is_test_account: boolean;
};

export type ConversationDetail = {
  room_id: string;
  account_email: string;
  artist_name: string;
  artist_reference: string;
  messages: Message[];
};

// Function to get conversation list with account and artist info
export function getMockConversationList(): ConversationListItem[] {
  return mockRooms.map(room => {
    const account = mockAccounts.find(acc => acc.id === room.account_id) || 
      { id: '', email: 'unknown@example.com', is_test_account: false, created_at: '' };
    
    // Find first artist associated with this account
    const artist = mockArtists.find(art => art.account_id === room.account_id) ||
      { id: 'unknown', account_id: '', name: 'Unknown Artist', reference_id: '' };
    
    return {
      room_id: room.id,
      account_id: room.account_id,
      created_at: room.created_at,
      last_message_date: room.last_message_date,
      account_email: account.email,
      artist_id: artist.id,
      artist_name: artist.name,
      artist_reference: artist.reference_id || '',
      is_test_account: account.is_test_account || false
    };
  });
}

// Function to get conversation details
export function getMockConversationDetail(roomId: string): ConversationDetail | null {
  const room = mockRooms.find(r => r.id === roomId);
  if (!room) return null;
  
  const account = mockAccounts.find(acc => acc.id === room.account_id) || 
    { id: '', email: 'unknown@example.com', is_test_account: false, created_at: '' };
  
  const artist = mockArtists.find(art => art.account_id === room.account_id) ||
    { id: '', account_id: '', name: 'Unknown Artist', reference_id: '' };
  
  const messages = mockMessages[roomId] || [];
  
  return {
    room_id: room.id,
    account_email: account.email,
    artist_name: artist.name,
    artist_reference: artist.reference_id || '',
    messages: messages
  };
} 