import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { findOrCreateUser, getUserById } from '../services/auth.service.js';

console.log('Configuring Google OAuth Strategy...');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'NOT SET');
console.log('GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  try {
    done(null, user);
  } catch (error) {
    console.error('Deserialize user error:', error);
    done(error, null);
  }
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: process.env.GOOGLE_CALLBACK_URL!,
},
async (accessToken, refreshToken, profile: any, done) => {
  try {
    console.log('Google OAuth callback received');
    console.log('Profile ID:', profile.id);
    console.log('Profile email:', profile.emails?.[0]?.value);
    
    const { user, isNew } = await findOrCreateUser(profile);
    console.log('User found/created:', user.id, 'Is new:', isNew);
    done(null, user);
  } catch (error) {
    console.error('Google OAuth strategy error:', error);
    done(error, undefined);
  }
}
));

console.log('Google OAuth Strategy configured successfully');

export default passport;
