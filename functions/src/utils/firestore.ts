import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const firestore = admin.firestore();

export async function createRestaurant(data: any): Promise<void> {
  try {
    await firestore.collection('restaurants').doc(data.restaurantId).set({
      name: data.name,
      primaryContact: {
        name: data.contactName,
        phone: data.phone,
        role: 'Owner'
      },
      isActivated: false,
      createdAt: FieldValue.serverTimestamp()
    });
    console.log(`Restaurant ${data.name} created with ID ${data.restaurantId}`);
  } catch (error) {
    console.error('Error creating restaurant:', error);
    throw error;
  }
}

export async function updateSupplier(data: any): Promise<void> {
  try {
    const supplierRef = firestore
      .collection('restaurants')
      .doc(data.restaurantId)
      .collection('suppliers')
      .doc();

    await supplierRef.set({
      name: data.name,
      whatsapp: data.whatsapp,
      deliveryDays: data.deliveryDays,
      cutoffHour: data.cutoffHour,
      createdAt: FieldValue.serverTimestamp(),
      rating: 0
    });
    
    console.log(`Supplier ${data.name} added to restaurant ${data.restaurantId}`);
  } catch (error) {
    console.error('Error updating supplier:', error);
    throw error;
  }
}
