import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SetRoleRequest {
  target_user_id: string;
  role: 'internal_admin' | 'internal_user' | 'customer_admin' | 'customer_user' | 'tech_lead' | 'tech_sponsor';
  action: 'add' | 'remove';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting admin-set-user-role function');

    // Create admin client with service role for elevated privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('Invalid or expired token:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Authenticated user:', user.id);

    // Check if the calling user is an internal admin using the secure function
    const { data: hasAdminRole, error: roleCheckError } = await supabaseAdmin
      .rpc('has_role', { _user_id: user.id, _role: 'internal_admin' });

    if (roleCheckError) {
      console.error('Error checking admin role:', roleCheckError);
      return new Response(
        JSON.stringify({ error: 'Permission check failed' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!hasAdminRole) {
      console.error('User does not have internal_admin role:', user.id);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Only internal admins can modify user roles.' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const body: SetRoleRequest = await req.json();
    
    if (!body.target_user_id || !body.role || !body.action) {
      console.error('Missing required fields:', body);
      return new Response(
        JSON.stringify({ error: 'target_user_id, role, and action are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Role modification request:', body);

    // Validate role value
    const validRoles = ['internal_admin', 'internal_user', 'customer_admin', 'customer_user', 'tech_lead', 'tech_sponsor'];
    if (!validRoles.includes(body.role)) {
      console.error('Invalid role:', body.role);
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be one of: ' + validRoles.join(', ') }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prevent users from removing their own admin role
    if (body.action === 'remove' && body.target_user_id === user.id && body.role === 'internal_admin') {
      console.error('User attempting to remove their own admin role');
      return new Response(
        JSON.stringify({ error: 'You cannot remove your own admin role' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (body.action === 'add') {
      // Add role to user_roles table
      const { error: insertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: body.target_user_id,
          role: body.role,
          created_by: user.id,
        });

      if (insertError) {
        // Check if it's a duplicate key error (role already assigned)
        if (insertError.code === '23505') {
          console.log('Role already assigned to user');
          return new Response(
            JSON.stringify({ success: true, message: 'Role already assigned' }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        console.error('Error adding role:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to assign role' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Role added successfully');
    } else if (body.action === 'remove') {
      // Remove role from user_roles table
      const { error: deleteError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', body.target_user_id)
        .eq('role', body.role);

      if (deleteError) {
        console.error('Error removing role:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to remove role' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Role removed successfully');
    } else {
      console.error('Invalid action:', body.action);
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "add" or "remove"' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log the role change for audit
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: `${body.action}_user_role`,
        entity_type: 'user_roles',
        entity_id: body.target_user_id,
        details: { role: body.role, target_user_id: body.target_user_id },
      })
      .then(({ error }) => {
        if (error) console.error('Failed to log audit:', error);
      });

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
