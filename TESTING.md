# Testing Plan for SwaziRent

## User Flows to Test

### Authentication

- [ ] User can sign up as renter
- [ ] User can sign up as landlord
- [ ] User can log in
- [ ] User can reset password
- [ ] User can log out

### Renter Features

- [ ] Search properties
- [ ] Filter results
- [ ] View property details
- [ ] Save favorite properties
- [ ] Contact landlord via WhatsApp
- [ ] View saved properties in dashboard

### Landlord Features

- [ ] Add new property with photos
- [ ] Edit existing property
- [ ] Mark property as rented
- [ ] View listing statistics
- [ ] Delete property

### Admin Features

- [ ] View all listings
- [ ] Approve pending listings
- [ ] Reject listings with reason
- [ ] Verify/unverify landlords
- [ ] View reports
- [ ] Resolve reports

### Edge Cases

- [ ] Upload more than 15 photos
- [ ] Submit form with missing fields
- [ ] Access protected routes while logged out
- [ ] Session expiration
- [ ] Network errors during form submission
- [ ] Concurrent saves/favorites
