import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, MapPin, Star, LogOut } from "lucide-react";
import MainNavigation from "@/components/MainNavigation";
import ReviewCard from "@/components/ReviewCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Profile {
  user_id: string;
  full_name?: string;
  display_name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  date_of_birth?: string;
  guest_rating: number;
  guest_review_count: number;
  total_stays: number;
  verified: boolean;
  is_host: boolean;
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    display_name: '',
    phone: '',
    bio: '',
    location: '',
    date_of_birth: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        navigate('/auth');
        return;
      }

      await fetchProfile(user.id);
      await fetchReviews(user.id);
    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/auth');
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        display_name: data.display_name || '',
        phone: data.phone || '',
        bio: data.bio || '',
        location: data.location || '',
        date_of_birth: data.date_of_birth || ''
      });
    } catch (error: any) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(full_name, display_name, avatar_url)
        `)
        .eq('reviewee_id', userId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error: any) {
      console.error('Failed to load reviews:', error);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          display_name: formData.display_name || null,
          phone: formData.phone || null,
          bio: formData.bio || null,
          location: formData.location || null,
          date_of_birth: formData.date_of_birth || null
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      await fetchProfile(profile.user_id);
      setEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error('Failed to update profile');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <MainNavigation />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Profile not found</h2>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || profile.full_name || 'Guest User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      
      <div className="container mx-auto px-4 py-12 mt-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url} alt={displayName} />
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold">{displayName}</h1>
                {profile.location && (
                  <div className="flex items-center gap-1 text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </div>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{profile.guest_rating}</span>
                    <span className="text-muted-foreground">
                      ({profile.guest_review_count} reviews)
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {profile.total_stays} stays
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
              {profile.is_host && (
                <TabsTrigger value="hosting">Hosting</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Profile Information</CardTitle>
                    <Button
                      variant="outline"
                      onClick={() => editing ? handleSave() : setEditing(true)}
                    >
                      {editing ? 'Save' : 'Edit'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editing ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="full_name">Full Name</Label>
                          <Input
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="display_name">Display Name</Label>
                          <Input
                            id="display_name"
                            value={formData.display_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="date_of_birth">Date of Birth</Label>
                        <Input
                          id="date_of_birth"
                          type="date"
                          value={formData.date_of_birth}
                          onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          value={formData.bio}
                          onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                          placeholder="Tell us about yourself..."
                          rows={4}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Email</h4>
                          <p>{profile.email}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Phone</h4>
                          <p>{profile.phone || 'Not provided'}</p>
                        </div>
                      </div>

                      {profile.date_of_birth && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Date of Birth</h4>
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-4 w-4" />
                            {new Date(profile.date_of_birth).toLocaleDateString()}
                          </div>
                        </div>
                      )}

                      {profile.bio && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Bio</h4>
                          <p className="leading-relaxed">{profile.bio}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews">
              <div className="space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      reviewer={review.reviewer}
                      rating={review.rating}
                      comment={review.comment}
                      created_at={review.created_at}
                    />
                  ))
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <p className="text-muted-foreground">No reviews yet</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {profile.is_host && (
              <TabsContent value="hosting">
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-muted-foreground mb-4">Host dashboard coming soon</p>
                    <Button onClick={() => navigate('/host-dashboard')}>
                      Go to Host Dashboard
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Profile;