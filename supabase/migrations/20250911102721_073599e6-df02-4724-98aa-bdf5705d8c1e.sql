-- Update users with missing names and other profile information
UPDATE public.profiles 
SET 
  name = CASE 
    WHEN name IS NULL OR name = '' THEN 
      CASE 
        WHEN user_id = '540ee8d7-ae77-4587-95a3-a33fd2eb46d4' THEN 'Sarah Johnson'
        WHEN user_id = '09d83125-d962-46bf-ad26-9de52ca0eb7d' THEN 'Michael Chen'
        WHEN user_id = '1348ed43-210f-4d01-b977-27c3b7cee1b9' THEN 'Emma Williams'
        WHEN user_id = '3288fc42-dbdf-439e-baee-b7e3701e08b0' THEN 'David Rodriguez'
        WHEN user_id = '8c60eab8-2b97-47db-9ffa-1b832f04a9bd' THEN 'Lisa Thompson'
        WHEN user_id = '0d1fbcc3-75e1-4779-b2bb-4b530f0f184a' THEN 'James Wilson'
        WHEN user_id = 'e351243c-bd01-47fc-a134-39c7e6a2c1a6' THEN 'Sophie Anderson'
        ELSE 'User ' || substring(user_id::text, 1, 8)
      END
    ELSE name
  END,
  job_title = CASE 
    WHEN job_title IS NULL THEN 
      CASE 
        WHEN role = 'internal_admin' THEN 'System Administrator'
        WHEN role = 'internal_user' AND is_internal = true THEN 
          CASE 
            WHEN user_id = '540ee8d7-ae77-4587-95a3-a33fd2eb46d4' THEN 'Project Manager'
            WHEN user_id = '09d83125-d962-46bf-ad26-9de52ca0eb7d' THEN 'Software Engineer'
            WHEN user_id = '1348ed43-210f-4d01-b977-27c3b7cee1b9' THEN 'UI/UX Designer'
            WHEN user_id = '3288fc42-dbdf-439e-baee-b7e3701e08b0' THEN 'Technical Lead'
            WHEN user_id = '8c60eab8-2b97-47db-9ffa-1b832f04a9bd' THEN 'Business Analyst'
            WHEN user_id = '0d1fbcc3-75e1-4779-b2bb-4b530f0f184a' THEN 'DevOps Engineer'
            WHEN user_id = 'e351243c-bd01-47fc-a134-39c7e6a2c1a6' THEN 'Quality Assurance'
            ELSE 'Team Member'
          END
        WHEN role = 'external_admin' THEN 'Client Administrator'
        WHEN role = 'external_user' THEN 'Client User'
        ELSE 'Team Member'
      END
    ELSE job_title
  END,
  phone = CASE 
    WHEN phone IS NULL THEN 
      CASE 
        WHEN user_id = '540ee8d7-ae77-4587-95a3-a33fd2eb46d4' THEN '+44 7700 900123'
        WHEN user_id = '09d83125-d962-46bf-ad26-9de52ca0eb7d' THEN '+44 7700 900456'
        WHEN user_id = '1348ed43-210f-4d01-b977-27c3b7cee1b9' THEN '+44 7700 900789'
        WHEN user_id = '3288fc42-dbdf-439e-baee-b7e3701e08b0' THEN '+44 7700 900012'
        WHEN user_id = '8c60eab8-2b97-47db-9ffa-1b832f04a9bd' THEN '+44 7700 900345'
        WHEN user_id = '0d1fbcc3-75e1-4779-b2bb-4b530f0f184a' THEN '+44 7700 900678'
        WHEN user_id = 'e351243c-bd01-47fc-a134-39c7e6a2c1a6' THEN '+44 7700 900901'
        ELSE '+44 7700 900' || lpad((random() * 999)::int::text, 3, '0')
      END
    ELSE phone
  END,
  avatar_url = CASE 
    WHEN avatar_url IS NULL THEN 
      'https://api.dicebear.com/7.x/avataaars/svg?seed=' || encode(user_id::text::bytea, 'base64')
    ELSE avatar_url
  END
WHERE name IS NULL OR name = '' OR job_title IS NULL OR phone IS NULL OR avatar_url IS NULL;