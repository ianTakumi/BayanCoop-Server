-- 1. CREATE COMMUNITIES TABLE
CREATE TABLE communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  slug TEXT UNIQUE,
  image_url TEXT,
  banner_url TEXT,
  rules TEXT,
  privacy TEXT CHECK(privacy IN('public', 'private')) DEFAULT 'public',
  status TEXT CHECK (status IN ('pending', 'active', 'inactive', 'archived')) DEFAULT 'pending',
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,
  total_members INTEGER DEFAULT 0,
  male_count INTEGER DEFAULT 0,
  female_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP,
  archive_reason TEXT
);

-- 2. CREATE COMMUNITY MEMBERS TABLE
CREATE TABLE community_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE, 
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  post_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  role TEXT CHECK (role IN('member', 'moderator', 'admin')) DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(community_id, user_id)
);

-- 3. CREATE POSTS TABLE
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, 
  title TEXT NOT NULL, 
  content TEXT, 
  post_type TEXT CHECK(post_type IN ('text', 'link', 'image', 'poll', 'video')) DEFAULT 'text',
  url TEXT,
  image_urls TEXT[],
  poll_options JSONB,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_removed BOOLEAN DEFAULT FALSE,
  removed_by UUID REFERENCES auth.users(id),
  removed_at TIMESTAMP,
  removal_reason TEXT,
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CREATE POST_COMMENTS TABLE (INSTEAD OF COMMENTS)
CREATE TABLE post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE, 
  content TEXT NOT NULL,
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  is_removed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. CREATE INDEXES FOR POSTS
CREATE INDEX idx_posts_community_created ON posts(community_id, created_at DESC);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_hot ON posts(upvote_count DESC, created_at DESC);
CREATE INDEX idx_posts_community_pinned ON posts(community_id, is_pinned, created_at DESC);

-- 6. CREATE INDEXES FOR POST_COMMENTS
CREATE INDEX idx_post_comments_post ON post_comments(post_id, created_at);
CREATE INDEX idx_post_comments_parent ON post_comments(parent_id);
CREATE INDEX idx_post_comments_author ON post_comments(author_id);

-- 7. CREATE INDEXES FOR COMMUNITIES
CREATE INDEX idx_communities_slug ON communities(slug);
CREATE INDEX idx_communities_created_by ON communities(created_by);
CREATE INDEX idx_communities_status ON communities(status, is_approved);

-- 8. CREATE INDEXES FOR COMMUNITY MEMBERS
CREATE INDEX idx_community_members_user ON community_members(user_id);
CREATE INDEX idx_community_members_community ON community_members(community_id);
CREATE INDEX idx_community_members_role ON community_members(community_id, role);